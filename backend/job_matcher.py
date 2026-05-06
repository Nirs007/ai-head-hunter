"""
job_matcher.py - Use Claude API to score candidates against job requirements.
Processes candidates in batches of 8 to minimize API calls.
"""

import json
import logging
import os
import re
import time
import anthropic
from dotenv import load_dotenv
from quick_matcher import _role_title_match_score

load_dotenv(override=True)

logger = logging.getLogger(__name__)

_raw_key = os.environ.get("ANTHROPIC_API_KEY", "")
_api_key = _raw_key.strip().encode("ascii", errors="ignore").decode("ascii")
client = anthropic.Anthropic(api_key=_api_key)

BATCH_SIZE = 8

MATCHING_PROMPT = """You are an expert tech recruiter. Evaluate candidates against the job requirements below.

JOB REQUIREMENTS:
{job_requirements}
{rejection_context}
CANDIDATES:
{candidates_json}

For each candidate, analyze fit and return a JSON array. Return ONLY the JSON array, no markdown, no explanation.

Each item in the array must have:
{{
  "candidate_id": <same id from input>,
  "candidate_name": "<name>",
  "match_percentage": <0-100 integer>,
  "advantages": ["advantage 1", "advantage 2"],
  "disadvantages": ["disadvantage 1"],
  "missing_requirements": ["missing skill 1", "missing requirement 2"],
  "matching_technologies": ["tech1", "tech2"],
  "management_note": "Has 3 years team lead experience" or "No management experience",
  "experience_note": "8 years backend, exceeds requirement of 5",
  "recommendation": "One sentence summary of fit"
}}

Scoring guidance:
- 90-100: Exceptional match, meets all requirements and brings extra value
- 70-89: Good match, meets most requirements
- 50-69: Partial match, meets core requirements but missing some
- 30-49: Weak match, missing key requirements
- 0-29: Poor match

CRITICAL — Role-type alignment accounts for ~30% of the score:
Each candidate includes a pre-computed "role_type_match" field. Use it as a strong signal.
- "MATCH" → candidate has worked in this role type (current or recent) — base score can reach 90+
- "OLD" → matched only in older roles — penalise, score should not exceed ~70
- "MISMATCH" → candidate has NEVER worked in this role type — cap score at 45, regardless of tech stack

Function-type mismatch is a HARD disqualifier — analyst ≠ developer ≠ tester:
  • Searching "CRM Systems Analyst" → a "CRM Developer" is MISMATCH even if they know Dynamics → score ≤ 45
  • Searching "QA Automation Engineer" → a "Backend Developer" who knows Python/Jenkins → MISMATCH → score ≤ 45
  • Searching "CRM Systems Analyst" → a "CRM Functional Consultant" or "CRM Business Analyst" → MATCH → can score 80+
  • Searching "QA Automation Engineer" → an "SDET" or "QA Engineer" → MATCH → can score 80+
- If role_type_match is "N/A" (no domain keywords in job title), rely on other signals.

Role recency is also important:
- If the candidate's MOST RECENT role directly matches the required role title → strong positive.
- If relevant experience was 3+ roles ago → reduce score significantly.
- If the candidate's current role is completely unrelated → major disadvantage.

Be strict about required technologies — missing a required technology reduces score significantly.
Management requirement is a hard filter if specified.
If HIRING MANAGER FEEDBACK is provided above, calibrate scoring accordingly.
"""


def build_job_description(job: dict) -> str:
    lines = [f"Role: {job.get('role_title', 'N/A')}"]
    if job.get("min_experience_years"):
        lines.append(f"Minimum experience: {job['min_experience_years']} years")
    if job.get("required_technologies"):
        lines.append(f"Required technologies: {', '.join(job['required_technologies'])}")
    if job.get("nice_to_have"):
        lines.append(f"Nice to have: {', '.join(job['nice_to_have'])}")
    if job.get("management_required"):
        lines.append("Management experience: REQUIRED")
    if job.get("location"):
        lines.append(f"Location: {job['location']}")
    if job.get("domain"):
        lines.append(f"Domain/Industry: {job['domain']}")
    if job.get("org_type"):
        lines.append(f"Organization type: {job['org_type']}")
    if job.get("salary_range"):
        lines.append(f"Salary range: {job['salary_range']}")
    if job.get("hybrid_mode"):
        lines.append(f"Work mode: {job['hybrid_mode']}")
    if job.get("vendor_experience_required"):
        lines.append("Vendor/integrator side experience: REQUIRED")
    if job.get("additional_notes"):
        lines.append(f"Additional notes: {job['additional_notes']}")
    return "\n".join(lines)


def _role_type_label(candidate: dict, job_title: str) -> str:
    """Return a short label for Claude indicating role-type alignment."""
    score, meaningful = _role_title_match_score(candidate, job_title)
    if not meaningful:
        return "N/A"
    if score >= 0.75:
        return "MATCH"
    if score >= 0.20:
        return "OLD"
    return "MISMATCH"


def _score_batch(job_description: str, batch: list[dict], rejection_context: str = "", job: dict | None = None) -> list[dict]:
    """Score a batch of candidates and return list of match results."""
    job_title = (job or {}).get("role_title") or ""
    # Build compact candidate summaries for the prompt
    candidates_input = []
    for c in batch:
        candidates_input.append({
            "id": c["id"],
            "name": c.get("name") or "Unknown",
            "current_role": c.get("current_role") or "",
            "total_experience_years": c.get("total_experience_years") or 0,
            "technologies": c.get("technologies") or [],
            "management_experience": c.get("management_experience") or False,
            "management_years": c.get("management_years") or 0,
            "all_roles": c.get("all_roles") or [],
            "location": c.get("location") or "",
            "education": c.get("education") or "",
            "raw_summary": (c.get("raw_summary") or "")[:300],
            "role_type_match": _role_type_label(c, job_title),
        })

    for attempt in range(4):
        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": MATCHING_PROMPT.format(
                            job_requirements=job_description,
                            rejection_context=rejection_context,
                            candidates_json=json.dumps(candidates_input, ensure_ascii=False, indent=2),
                        ),
                    }
                ],
            )

            response_text = message.content[0].text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            results = json.loads(response_text)
            if isinstance(results, list):
                return results
            return []

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse matching response: {e}")
            return []
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                logger.error(f"Claude API error during matching: {exc}")
                raise  # propagate permanent errors (billing, auth, etc.)
            wait = 15 * (attempt + 1)
            if attempt < 3:
                logger.warning(f"Anthropic {exc.status_code} during matching, retrying in {wait}s (attempt {attempt+1}/3)...")
                time.sleep(wait)
            else:
                logger.error("Anthropic overloaded during matching after 3 retries.")
                return []
        except Exception as e:
            logger.error(f"Claude API error during matching: {e}")
            return []
    return []


def _build_rejection_context(rejections: list[dict]) -> str:
    """Build a prompt section from recruiter rejection feedback."""
    if not rejections:
        return ""
    lines = ["\nHIRING MANAGER FEEDBACK — candidates previously reviewed and rejected for this role:"]
    for r in rejections:
        name = r.get("name") or "Unknown"
        reason = r.get("rejection_reason") or "לא מתאים"
        lines.append(f"- {name}: {reason}")
    lines.append("Use this feedback to calibrate scoring — downgrade candidates with similar weaknesses.\n")
    return "\n".join(lines)


def _friendly_api_error(exc: anthropic.APIStatusError) -> str:
    """Convert an Anthropic APIStatusError into a Hebrew-friendly message."""
    msg = str(exc)
    if exc.status_code == 400 and "credit balance" in msg.lower():
        return "יתרת הקרדיט ב-Anthropic נגמרה — יש להוסיף קרדיט בכתובת console.anthropic.com"
    if exc.status_code == 401:
        return "מפתח ה-API של Anthropic שגוי או לא תקף — בדוק את משתנה הסביבה ANTHROPIC_API_KEY"
    if exc.status_code == 403:
        return "אין הרשאה לשימוש ב-API — בדוק הגדרות החשבון ב-Anthropic"
    return f"שגיאת Anthropic API (קוד {exc.status_code}): {msg[:200]}"


def match_candidates_streaming(
    job: dict,
    candidates: list[dict],
    top_n: int = 10,
    min_match_pct: int = 60,
    rejections: list[dict] | None = None,
    skip_pre_filter: bool = False,
):
    """
    Generator version: yields progress/result dicts for SSE streaming.
    Events: start → batch (x N) → results
    Set skip_pre_filter=True when caller has already filtered to explicit candidate IDs.
    """
    if not candidates:
        yield {"type": "results", "results": [], "total_candidates": 0, "candidates_checked": 0, "matches_found": 0}
        return

    job_description = build_job_description(job)
    rejection_context = _build_rejection_context(rejections or [])
    min_exp = job.get("min_experience_years") or 0
    if skip_pre_filter:
        pre_filtered = candidates
    else:
        pre_filtered = [c for c in candidates if (c.get("total_experience_years") or 0) >= max(0, min_exp - 3)]
    total_batches = max(1, (len(pre_filtered) + BATCH_SIZE - 1) // BATCH_SIZE)

    yield {
        "type": "start",
        "total_candidates": len(candidates),
        "candidates_checked": len(pre_filtered),
        "total_batches": total_batches,
        "min_exp_filter": max(0, min_exp - 3),
    }

    all_results = []
    for batch_num, i in enumerate(range(0, len(pre_filtered), BATCH_SIZE), 1):
        batch = pre_filtered[i: i + BATCH_SIZE]
        try:
            batch_results = _score_batch(job_description, batch, rejection_context, job=job)
        except anthropic.APIStatusError as exc:
            # Permanent API error (e.g. billing, auth) — surface to client immediately
            err_msg = _friendly_api_error(exc)
            yield {"type": "error", "message": err_msg}
            return
        except Exception as exc:
            yield {"type": "error", "message": f"שגיאת API בלתי צפויה: {exc}"}
            return

        candidate_map = {c["id"]: c for c in batch}
        batch_merged = []
        for result in batch_results:
            cid = result.get("candidate_id")
            if cid in candidate_map:
                merged = {**candidate_map[cid], **result}
                all_results.append(merged)
                batch_merged.append(merged)

        yield {
            "type": "batch",
            "batch_num": batch_num,
            "total_batches": total_batches,
            "processed_so_far": min(i + BATCH_SIZE, len(pre_filtered)),
            "candidates_checked": len(pre_filtered),
            "batch_results": batch_merged,
        }

    filtered_results = [r for r in all_results if r.get("match_percentage", 0) >= min_match_pct]
    filtered_results.sort(key=lambda x: x.get("match_percentage", 0), reverse=True)
    results = filtered_results[:top_n]

    yield {
        "type": "results",
        "results": results,
        "total_candidates": len(candidates),
        "candidates_checked": len(pre_filtered),
        "matches_found": len(results),
        "above_threshold": len(filtered_results),
    }


def match_candidates(
    job: dict,
    candidates: list[dict],
    top_n: int = 10,
    min_match_pct: int = 60,
) -> list[dict]:
    """Synchronous wrapper kept for backward compatibility."""
    results = []
    for event in match_candidates_streaming(job, candidates, top_n, min_match_pct):
        if event["type"] == "results":
            results = event["results"]
    return results


_MODE_INSTRUCTIONS = {
    "standard": "",
    "conservative": (
        "\nANALYSIS MODE: CONSERVATIVE\n"
        "Be strict — only mark a requirement as 'קיים' if it is explicitly and clearly stated in the CV. "
        "Mark anything ambiguous as 'נרמז' or 'חלקי'. "
        "The submission_summary must ONLY reference things explicitly stated in the CV — do not extrapolate.\n"
    ),
    "marketing": (
        "\nANALYSIS MODE: MARKETING\n"
        "Write the submission_summary in a strong, persuasive but fully truthful style. "
        "Frame partial matches positively and emphasise strengths. "
        "Do NOT invent or imply facts not supported by the CV or call notes.\n"
    ),
}

SINGLE_CANDIDATE_PROMPT = """You are an expert tech recruiter doing a deep analysis of one specific candidate for a job.

JOB REQUIREMENTS:
{job_description}

CANDIDATE PROFILE:
{candidate_json}
{mode_section}
Analyze the candidate thoroughly and return ONLY a valid JSON object with these exact keys:
{{
  "match_percentage": <0-100 integer>,
  "advantages": ["advantage in Hebrew", ...],
  "disadvantages": ["disadvantage in Hebrew", ...],
  "missing_requirements": ["missing tech or skill", ...],
  "matching_technologies": ["tech1", "tech2", ...],
  "management_note": "management experience summary in Hebrew",
  "experience_note": "experience years summary in Hebrew",
  "recommendation": "one sentence recommendation in Hebrew",
  "short_summary": "exactly 2 sentences in Hebrew — why (or why not) to submit this candidate. Be specific and direct.",
  "missing_summary": ["חסר: X — brief explanation", "לא ברור: Y — brief explanation"],
  "match_grades": [
    {{"requirement": "requirement text", "status": "קיים|חלקי|נרמז|חסר|יתרון", "note": "one line Hebrew explanation"}}
  ],
  "submission_summary": "2-4 sentences in Hebrew suitable for presenting this candidate to the client — highlight key strengths and specific fit for this role",
  "cv_review": "3-5 sentences in Hebrew providing expert critique of this CV in context of this specific role — what stands out, what is missing or unclear, and how well the CV communicates relevant experience",
  "cv_improvements": ["specific actionable suggestion 1 in Hebrew", "specific actionable suggestion 2 in Hebrew", ...]
}}

MATCH GRADES — evaluate every mandatory requirement and every key nice-to-have from the job description:
- "קיים"  = explicitly and clearly present in the CV
- "חלקי"  = partially present (fewer years, smaller scale, adjacent skill)
- "נרמז"  = implied but not explicitly stated
- "חסר"   = not present at all
- "יתרון" = nice-to-have only, not mandatory

If the candidate profile includes salary_expectation, availability, or call_notes — factor them into your analysis and include them in the submission_summary where relevant.
All text values must be in Hebrew (עברית).
cv_improvements must be specific and actionable based on the actual profile.
Return ONLY the JSON object, no markdown fences, no explanation.
"""


def check_candidate_for_job(candidate: dict, job: dict, mode: str = "standard") -> dict | None:
    """
    Deep analysis of a single candidate vs a job.
    Returns match data + summaries (submission, cv_review, cv_improvements, short_summary,
    missing_summary, match_grades), or None on failure.
    mode: "standard" | "conservative" | "marketing"
    """
    job_description = build_job_description(job)
    mode_section = _MODE_INSTRUCTIONS.get(mode, "")

    candidate_input = {
        "id": candidate.get("id"),
        "name": candidate.get("name") or "Unknown",
        "current_role": candidate.get("current_role") or "",
        "current_company": candidate.get("current_company") or "",
        "total_experience_years": candidate.get("total_experience_years") or 0,
        "technologies": candidate.get("technologies") or [],
        "management_experience": candidate.get("management_experience") or False,
        "management_years": candidate.get("management_years") or 0,
        "management_scope": candidate.get("management_scope") or "",
        "all_roles": candidate.get("all_roles") or [],
        "location": candidate.get("location") or "",
        "education": candidate.get("education") or "",
        "notable_companies": candidate.get("notable_companies") or [],
        "raw_summary": (candidate.get("raw_summary_he") or candidate.get("raw_summary") or "")[:600],
        "salary_expectation": candidate.get("salary_expectation") or "",
        "availability": candidate.get("availability") or "",
        "call_notes": candidate.get("call_notes") or "",
    }

    for attempt in range(3):
        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=5000,
                messages=[{
                    "role": "user",
                    "content": SINGLE_CANDIDATE_PROMPT.format(
                        job_description=job_description,
                        candidate_json=json.dumps(candidate_input, ensure_ascii=False, indent=2),
                        mode_section=mode_section,
                    ),
                }],
            )
            response_text = message.content[0].text.strip()
            # Strip markdown code fences (```json ... ``` or ``` ... ```)
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1]).strip()
            # Extract JSON object even if Claude prefixed with prose
            if not response_text.startswith("{"):
                m = re.search(r'\{[\s\S]*\}', response_text)
                if m:
                    response_text = m.group()
            return json.loads(response_text)

        except json.JSONDecodeError as e:
            logger.warning(f"check_candidate_for_job attempt {attempt+1}: JSON parse error: {e!r}")
            if attempt < 2:
                time.sleep(2)
                continue
            return None
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                logger.error(f"check_candidate_for_job API error: {exc}")
                return None
            wait = 15 * (attempt + 1)
            if attempt < 2:
                logger.warning(f"Anthropic {exc.status_code}, retrying in {wait}s (attempt {attempt+1}/3)...")
                time.sleep(wait)
            else:
                logger.error("Anthropic overloaded after 3 retries.")
                raise RuntimeError("שרת ה-AI עמוס כרגע — אנא נסה שוב בעוד מספר דקות.")
        except Exception as e:
            logger.error(f"check_candidate_for_job error: {e}")
            return None
    return None


INTERVIEW_PREP_PROMPT = """You are an expert tech recruiter preparing a candidate for a job interview.

JOB REQUIREMENTS:
{job_description}

CANDIDATE PROFILE:
{candidate_json}

Based on the candidate's actual background and the specific job requirements, generate personalized interview preparation advice.
Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "key_strengths_to_emphasize": ["specific strength to highlight, based on their actual experience", ...],
  "weak_points_to_prepare": ["how to address gap or weakness relevant to this role", ...],
  "suggested_questions": ["likely interview question 1", "likely interview question 2", ...],
  "technical_prep": ["specific technical topic or skill to review before the interview", ...],
  "overall_advice": "2-3 sentence strategic advice tailored to this candidate and role"
}}

All text values must be in Hebrew (עברית).
Return ONLY the JSON object.
"""


def generate_interview_prep(candidate: dict, job: dict) -> dict | None:
    """Generate interview preparation advice for a specific candidate + job."""
    job_description = build_job_description(job)
    candidate_input = {
        "name": candidate.get("name") or "Unknown",
        "current_role": candidate.get("current_role") or "",
        "total_experience_years": candidate.get("total_experience_years") or 0,
        "technologies": candidate.get("technologies") or [],
        "management_experience": candidate.get("management_experience") or False,
        "management_years": candidate.get("management_years") or 0,
        "all_roles": candidate.get("all_roles") or [],
        "education": candidate.get("education") or "",
        "raw_summary": (candidate.get("raw_summary_he") or candidate.get("raw_summary") or "")[:500],
    }
    for attempt in range(3):
        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": INTERVIEW_PREP_PROMPT.format(
                        job_description=job_description,
                        candidate_json=json.dumps(candidate_input, ensure_ascii=False, indent=2),
                    ),
                }],
            )
            response_text = message.content[0].text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"generate_interview_prep: failed to parse: {e}")
            return None
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                logger.error(f"generate_interview_prep API error: {exc}")
                return None
            wait = 15 * (attempt + 1)
            if attempt < 2:
                time.sleep(wait)
            else:
                raise RuntimeError("שרת ה-AI עמוס כרגע — אנא נסה שוב בעוד מספר דקות.")
        except Exception as e:
            logger.error(f"generate_interview_prep error: {e}")
            return None
    return None


# ── Raw-text submission builder ────────────────────────────────────────────────

RAW_SUBMISSION_PROMPT = """You are an expert Israeli tech recruiter doing a deep analysis.

You receive a raw job description and a candidate's CV / profile (in any language).
Your job: analyze the fit and produce a professional submission summary in Hebrew.

CRITICAL RULES — read carefully:
1. NEVER invent information not present in the CV or call notes.
2. Clearly distinguish: דרישת חובה (mandatory) vs יתרון (nice-to-have).
3. Mark each claim as קיים / חלקי / נרמז / חסר / יתרון.
4. If something is unclear or not explicitly stated, say so — do NOT assume it exists.
5. The submission_summary must be factual, professional, concise (2-4 sentences), in Hebrew.
6. salary_expectation and availability come ONLY from what is provided — never guess.

=== JOB DESCRIPTION ===
{job_text}

=== CANDIDATE CV / PROFILE ===
{candidate_text}

=== ADDITIONAL INFO FROM RECRUITER ===
שם מועמד: {candidate_name}
ציפיות שכר: {salary}
זמינות: {availability}
הערות שיחה: {call_notes}

=== ANALYSIS MODE: {mode_label} ===
{mode_instruction}

Return ONLY a valid JSON object (no markdown fences, no explanation):
{{
  "job_parsed": {{
    "role_title": "extracted job title",
    "mandatory_requirements": ["requirement 1", "requirement 2"],
    "nice_to_have": ["item 1"],
    "hidden_signals": ["implicit emphasis or context clue"]
  }},
  "candidate_parsed": {{
    "name": "candidate name",
    "current_role": "current/most recent role",
    "total_experience_years": <integer or null>,
    "key_technologies": ["tech1", "tech2"],
    "management_experience": true/false,
    "management_scope": "brief description or empty string",
    "notable_companies": ["company1"],
    "education": "brief education summary or empty string"
  }},
  "match_percentage": <0-100 integer>,
  "match_grades": [
    {{"requirement": "requirement text", "status": "קיים|חלקי|נרמז|חסר|יתרון", "note": "one line Hebrew explanation"}}
  ],
  "advantages": ["advantage in Hebrew", ...],
  "disadvantages": ["disadvantage in Hebrew", ...],
  "missing_requirements": ["missing item in Hebrew", ...],
  "missing_summary": ["חסר: X — brief explanation", ...],
  "short_summary": "exactly 2 sentences in Hebrew — why (or why not) to submit this candidate",
  "recommendation": "one sentence recommendation in Hebrew",
  "submission_summary": "formatted submission summary in Hebrew — 2-4 sentences, specific to this role. Start with the candidate name and key relevant experience. Include salary and availability if provided.",
  "submission_formatted": "שם משרה: {role_placeholder}\\nשם מועמד/ת: {name_placeholder}\\nציפיות שכר: {salary_placeholder}\\nזמינות: {avail_placeholder}\\n\\nסיכום מועמד:\\n<the submission_summary text>"
}}

submission_formatted must follow EXACTLY this format — fill in the placeholders from context.
All Hebrew text must be professional, clear, and flow naturally.
"""

_RAW_MODE_INSTRUCTIONS = {
    "standard": ("STANDARD", ""),
    "conservative": (
        "CONSERVATIVE",
        "Be strict — only mark a requirement as 'קיים' if it is explicitly and clearly stated. "
        "Mark anything ambiguous as 'נרמז' or 'חלקי'. "
        "The submission_summary must ONLY reference things explicitly stated — do not extrapolate.",
    ),
    "marketing": (
        "MARKETING",
        "Write the submission_summary in a strong, persuasive but fully truthful style. "
        "Frame partial matches positively and emphasise strengths. "
        "Do NOT invent or imply facts not supported by the CV or call notes.",
    ),
}


def analyze_submission_raw(
    job_text: str,
    candidate_text: str,
    candidate_name: str = "",
    salary: str = "",
    availability: str = "",
    call_notes: str = "",
    mode: str = "standard",
) -> dict | None:
    """
    Deep analysis from raw free-text inputs (no DB records required).
    Parses both the job description and the CV, then produces matching analysis
    and a formatted Hebrew submission summary.
    """
    mode_label, mode_instruction = _RAW_MODE_INSTRUCTIONS.get(mode, _RAW_MODE_INSTRUCTIONS["standard"])

    prompt = RAW_SUBMISSION_PROMPT.format(
        job_text=job_text.strip()[:6000],
        candidate_text=candidate_text.strip()[:5000],
        candidate_name=candidate_name or "לא צוין",
        salary=salary or "לא צוין",
        availability=availability or "לא צוין",
        call_notes=call_notes or "—",
        mode_label=mode_label,
        mode_instruction=mode_instruction,
        role_placeholder="{{role_title}}",
        name_placeholder="{{candidate_name}}",
        salary_placeholder="{{salary}}",
        avail_placeholder="{{availability}}",
    )

    for attempt in range(3):
        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=6000,
                messages=[{"role": "user", "content": prompt}],
            )
            response_text = message.content[0].text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1]).strip()
            if not response_text.startswith("{"):
                m = re.search(r'\{[\s\S]*\}', response_text)
                if m:
                    response_text = m.group()

            result = json.loads(response_text)

            # Fix submission_formatted placeholders using parsed data
            job_title = result.get("job_parsed", {}).get("role_title", "—")
            cand_name = result.get("candidate_parsed", {}).get("name") or candidate_name or "—"
            sal = salary or "לא צוין"
            avail = availability or "לא צוין"

            result["submission_formatted"] = (
                f"שם משרה: {job_title}\n"
                f"שם מועמד/ת: {cand_name}\n"
                f"ציפיות שכר: {sal}\n"
                f"זמינות: {avail}\n\n"
                f"סיכום מועמד:\n{result.get('submission_summary', '')}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.warning(f"analyze_submission_raw attempt {attempt+1}: JSON parse error: {e!r}")
            if attempt < 2:
                time.sleep(2)
                continue
            return None
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                logger.error(f"analyze_submission_raw API error: {exc}")
                return None
            wait = 15 * (attempt + 1)
            if attempt < 2:
                logger.warning(f"Anthropic {exc.status_code}, retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise RuntimeError("שרת ה-AI עמוס כרגע — אנא נסה שוב בעוד מספר דקות.")
        except Exception as e:
            logger.error(f"analyze_submission_raw error: {e}")
            return None
    return None
