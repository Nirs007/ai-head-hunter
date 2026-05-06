"""
cv_processor.py - Use Claude API to extract structured candidate data from CV text.
Results are cached by file hash in the SQLite database.
Supports both Hebrew and English CVs — Hebrew CVs are extracted with role titles in Hebrew.
"""

import json
import logging
import os
import time
from dotenv import load_dotenv
import anthropic

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# Strip any non-ASCII chars that can sneak in via CMD encoding or BOM
_raw_key = os.environ.get("ANTHROPIC_API_KEY", "")
_api_key = _raw_key.strip().encode("ascii", errors="ignore").decode("ascii")
if not _api_key:
    logger.error("ANTHROPIC_API_KEY is missing or contains only non-ASCII characters!")

client = anthropic.Anthropic(api_key=_api_key)


def detect_hebrew(text: str) -> bool:
    """Return True if the text contains significant Hebrew content (>8% Hebrew chars)."""
    if not text:
        return False
    hebrew_chars = sum(1 for c in text if '\u05d0' <= c <= '\u05ea')
    return hebrew_chars / max(len(text), 1) > 0.08


EXTRACTION_PROMPT_EN = """You are an expert recruiter assistant. Extract structured information from the following CV text.

CV TEXT:
{cv_text}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "name": "Full name of candidate",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "current_role": "Most recent job title in English",
  "current_company": "Most recent company name or null",
  "all_roles": [
    {{"title": "Job Title in English", "company": "Company Name", "years": "2019-2022", "company_size": "startup/mid/enterprise"}}
  ],
  "total_experience_years": 7.5,
  "technologies": ["Python", "React", "AWS", "SQL"],
  "management_experience": true,
  "management_years": 3.0,
  "management_scope": "Led a team of 12 engineers across 3 countries or null",
  "education": "B.Sc Computer Science, Tel Aviv University",
  "location": "Tel Aviv, Israel or null",
  "company_background": "enterprise",
  "notable_companies": ["Google", "Microsoft"],
  "raw_summary": "3-4 sentence professional summary in English highlighting key strengths, experience level, and what makes this candidate unique",
  "raw_summary_he": "אותו סיכום מקצועי ב-3-4 משפטים בעברית",
  "recommended_roles": ["Senior Backend Engineer", "Tech Lead", "VP Engineering"],
  "linkedin_url": "https://www.linkedin.com/in/username or null",
  "cv_language": "en"
}}

Rules:
- name: Copy the candidate's full name EXACTLY as it appears in the CV — do NOT translate, transliterate, or romanize Hebrew/non-Latin names
- total_experience_years: estimate based on career history (number, not string)
- management_experience: true if they managed people/teams, false otherwise
- management_years: how many years managing people (0 if none)
- management_scope: brief description of largest team/org they managed, or null
- technologies: include programming languages, frameworks, tools, databases, cloud platforms
- company_background: "startup" if most experience in startups, "enterprise" if large corps, "mixed" if both
- company_size per role: "startup" (<50 employees), "mid" (50-500), "enterprise" (500+) - estimate from company name/context
- notable_companies: list of well-known companies they worked at (empty array if none)
- all_roles: list all positions from newest to oldest, job titles in English
- raw_summary: 3-4 sentences in English, highlight: seniority level, key expertise, notable achievements, company types
- raw_summary_he: exact Hebrew translation of raw_summary - same content, written in fluent Hebrew
- recommended_roles: 2-4 specific job titles this candidate would be a strong fit for (in English)
- cv_language: always "en" for this prompt
- Respond ONLY with the JSON, nothing else
"""

EXTRACTION_PROMPT_HE = """אתה עוזר מומחה לגיוס עובדים. חלץ מידע מובנה מטקסט קורות החיים הבאים שנכתבו בעברית.

טקסט קורות החיים:
{cv_text}

החזר אובייקט JSON תקין בלבד (ללא markdown, ללא הסבר) עם המבנה הבא:
{{
  "name": "שם מלא של המועמד",
  "email": "email@example.com or null",
  "phone": "מספר טלפון or null",
  "current_role": "תפקיד אחרון בעברית",
  "current_company": "שם החברה האחרונה or null",
  "all_roles": [
    {{"title": "שם התפקיד בעברית", "company": "שם החברה", "years": "2019-2022", "company_size": "startup/mid/enterprise"}}
  ],
  "total_experience_years": 7.5,
  "technologies": ["Python", "React", "AWS", "SQL"],
  "management_experience": true,
  "management_years": 3.0,
  "management_scope": "ניהל צוות של 12 מהנדסים ב-3 מדינות or null",
  "education": "תואר ראשון במדעי המחשב, אוניברסיטת תל אביב",
  "location": "תל אביב, ישראל or null",
  "company_background": "enterprise",
  "notable_companies": ["Google", "Microsoft"],
  "raw_summary": "3-4 sentence professional summary in English highlighting key strengths, experience level, and what makes this candidate unique",
  "raw_summary_he": "סיכום מקצועי של 3-4 משפטים בעברית המדגיש את החוזקות העיקריות, רמת הניסיון ומה מייחד את המועמד",
  "recommended_roles": ["מנהל מוצר בכיר", "ראש צוות פיתוח", "VP R&D"],
  "linkedin_url": "https://www.linkedin.com/in/username or null",
  "cv_language": "he"
}}

כללים:
- name: העתק את שם המועמד **בדיוק** כפי שמופיע בקורות החיים — **לא לתרגם, לא לתעתק לאנגלית** — אם השם בעברית, השאר בעברית; אם באנגלית, השאר באנגלית
- total_experience_years: הערכה על בסיס ההיסטוריה התעסוקתית (מספר, לא מחרוזת)
- management_experience: true אם ניהל אנשים/צוותים, false אחרת
- management_years: כמה שנים ניהל אנשים (0 אם אין)
- management_scope: תיאור קצר של הצוות/ארגון הגדול ביותר שניהל, או null
- technologies: כלול שפות תכנות, frameworks, כלים, מסדי נתונים, פלטפורמות ענן — **תמיד באנגלית** (Python, React וכו')
- company_background: "startup" אם רוב הניסיון בסטארטאפים, "enterprise" אם חברות גדולות, "mixed" אם שניהם
- company_size לכל תפקיד: "startup" (<50 עובדים), "mid" (50-500), "enterprise" (500+)
- notable_companies: רשימת חברות ידועות שעבד בהן (מערך ריק אם אין)
- all_roles: רשים את כל התפקידים מהחדש לישן, **כותרות התפקידים בעברית**
- current_role: תפקיד אחרון **בעברית**
- raw_summary: 3-4 משפטים **באנגלית** — רמת בכירות, מומחיות עיקרית, הישגים, סוגי חברות
- raw_summary_he: 3-4 משפטים **בעברית** — אותו תוכן בדיוק
- recommended_roles: 2-4 תפקידים שהמועמד מתאים להם — **בעברית**
- cv_language: תמיד "he" עבור prompt זה
- ענה אך ורק עם ה-JSON, ללא כל תוספת
"""


def extract_candidate_data(cv_text: str, file_name: str = "") -> dict:
    """
    Send CV text to Claude and return extracted structured data.
    Detects CV language and uses the appropriate prompt.
    Returns empty dict on failure.
    """
    if not cv_text or len(cv_text.strip()) < 50:
        logger.warning(f"CV text too short to process: {file_name}")
        return {}

    # Detect language and choose prompt
    is_hebrew = detect_hebrew(cv_text)
    prompt_template = EXTRACTION_PROMPT_HE if is_hebrew else EXTRACTION_PROMPT_EN
    lang = "he" if is_hebrew else "en"
    logger.debug(f"CV language detected: {lang} for {file_name}")

    # Truncate very long CVs to avoid token limits (keep first ~6000 chars)
    truncated = cv_text[:6000] if len(cv_text) > 6000 else cv_text

    for attempt in range(4):  # up to 4 attempts: 0, 1, 2, 3
        try:
            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": prompt_template.format(cv_text=truncated),
                    }
                ],
            )

            response_text = message.content[0].text.strip()

            # Strip markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            data = json.loads(response_text)
            # Ensure cv_language is always set
            data["cv_language"] = lang
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response for {file_name}: {e}\nResponse was: {response_text[:500]}")
            return {}
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                raise   # unexpected HTTP error — fall through to generic handler
            wait = 15 * (attempt + 1)  # 15s, 30s, 45s, then give up
            if attempt < 3:
                logger.warning(f"Anthropic {exc.status_code} for {file_name}, retrying in {wait}s (attempt {attempt+1}/3)...")
                time.sleep(wait)
            else:
                logger.error(f"Anthropic overloaded for {file_name} after 3 retries, skipping.")
                return {}
        except Exception as e:
            logger.error(f"Claude API error for {file_name}: {type(e).__name__}: {e}", exc_info=True)
            return {}
    return {}
