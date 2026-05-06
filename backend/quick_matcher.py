"""
quick_matcher.py - Instant candidate scoring using stored structured data.
No API calls — results in milliseconds based on keyword/experience matching.
"""

import re
from datetime import datetime

CURRENT_YEAR = datetime.now().year


def _normalize(text: str) -> str:
    """Lowercase and collapse separators for fuzzy tech matching."""
    return re.sub(r'[.\-_/\s]+', ' ', text.lower()).strip()


# Generic role/seniority words that should NOT be treated as technology requirements
_TITLE_STOPWORDS = {
    'senior', 'junior', 'lead', 'manager', 'engineer', 'developer', 'analyst',
    'specialist', 'architect', 'consultant', 'director', 'head', 'chief', 'vice',
    'team', 'staff', 'principal', 'associate', 'backend', 'frontend', 'fullstack',
    'full', 'stack', 'software', 'system', 'systems', 'information', 'data',
    'cloud', 'technical', 'digital', 'product', 'business', 'enterprise',
    'global', 'regional', 'solution', 'solutions', 'platform', 'service',
    'services', 'integration', 'implementation', 'support', 'operation',
    'operations', 'development', 'management', 'infrastructure', 'security',
    'network', 'application', 'applications', 'project', 'program', 'delivery',
    # Hebrew common role words (normalized form)
    'מנהל', 'מפתח', 'אנליסט', 'ארכיטקט', 'מומחה', 'בכיר', 'צוות',
}

# Short domain acronyms (2-3 chars) that carry specific role/domain meaning
# and must NOT be filtered out by the length >= 4 guard.
_SHORT_DOMAIN_ACRONYMS = {
    'qa', 'qe', 'bi', 'ux', 'ui', 'hr', 'it', 'ml', 'ai', 'ios',
    'dba', 'crm', 'erp', 'api', 'sdk', 'sre', 'ops', 'rnd', 'cto', 'cfo',
}

# ── Function-type clusters ────────────────────────────────────────────────────
# Answers "what type of professional is this?" for role-type compatibility checks.
# Roles in DIFFERENT clusters are incompatible — analyst ≠ developer ≠ tester etc.
#
# Words are split into TWO priority tiers so that specific function words always
# win over generic developer signals, even when both appear in the same title:
#
#   "CRM Business Development Analyst" → HIGH-PRIORITY "analyst" wins → cluster 0  ✓
#   "CRM Systems Development Team Lead" → no HIGH match → LOW "development" → cluster 1 ✓
#   "QA Automation Engineer"           → HIGH "qa" wins over LOW "engineer"  → cluster 2 ✓
#   "DevOps Engineer"                  → HIGH "devops" wins → cluster 5      ✓
#   "Senior CRM Engineer"              → no HIGH match → LOW "engineer" → cluster 1     ✓

# HIGH-PRIORITY: unambiguously specific function words.
_FUNC_HIGH: dict[str, int] = {
    # 0 — Analysis / Functional / Consulting
    'analyst': 0, 'analysis': 0, 'functional': 0, 'consultant': 0,
    'implementation': 0,   # CRM/ERP implementation specialist = functional
    # 2 — QA / Testing
    'tester': 2, 'testing': 2, 'qa': 2, 'qe': 2, 'sdet': 2,
    # 3 — Design / UX
    'designer': 3, 'ux': 3, 'ui': 3,
    # 4 — Architecture
    'architect': 4,
    # 5 — DevOps / SRE
    'devops': 5, 'sre': 5,
    # 6 — Data / ML / Science
    'scientist': 6, 'ml': 6, 'ai': 6,
    # 7 — Account Management / Sales / Customer Success
    'account': 7, 'sales': 7,
    # Hebrew
    'מנתח': 0, 'מנתחת': 0,
    'בודק': 2, 'בודקת': 2,
    'מעצב': 3, 'מעצבת': 3,
    'תיקי': 7,   # תיקי לקוחות = account management
}

# LOW-PRIORITY: generic development/engineering words used as a fallback when no
# specific function word is found.  These correctly classify "CRM Engineer" or
# "Development Team Lead" as developers without overriding "analyst" / "qa" etc.
_FUNC_LOW: dict[str, int] = {
    'developer': 1, 'programmer': 1, 'engineer': 1, 'development': 1, 'coding': 1,
    'מפתח': 1, 'מפתחת': 1,
    'מהנדס': 1, 'מהנדסת': 1,
}

# Management / leadership words: added as an ADDITIONAL role-type requirement when
# present in the job title so that e.g. "QA Team Lead" requires both 'qa' AND 'lead'.
# These are checked separately from the function-cluster (which handles hard blocking).
_ROLE_MGMT_TAGS: frozenset[str] = frozenset({
    'lead', 'leads',
    'manager', 'managers',
    'head',
    'supervisor',
    'owner',       # product owner
    'director',
    'principal',
    # Hebrew
    'ראש', 'מנהל', 'מנהלת',
})


def _func_cluster_from_words(words: list[str]) -> int | None:
    """Return the function cluster for a normalised word list, or None if ambiguous.
    HIGH-priority specific words are checked before LOW-priority generic dev words."""
    for w in words:
        if w in _FUNC_HIGH:
            return _FUNC_HIGH[w]
    for w in words:
        if w in _FUNC_LOW:
            return _FUNC_LOW[w]
    return None


def derive_role_type_tags(role_title: str) -> list[str]:
    """Extract ALL role-type keywords from a job title.

    Returns a list (importance order) of raw keywords injected as explicit tech
    requirements so that role-type compatibility is scored and visible in results.

    Examples:
      'QA Team Lead'              → ['qa', 'lead']
      'Dynamics CRM Analyst'      → ['analyst']
      'DevOps Engineer'           → ['devops']
      'Backend Developer Manager' → ['developer', 'manager']
      'Head of R&D'               → ['head']
      'Full Stack Team Lead'      → ['developer', 'lead']
    """
    if not role_title:
        return []
    words = _normalize(role_title).split()
    tags: list[str] = []

    # ① Primary function keyword (HIGH priority first, then LOW)
    for w in words:
        if w in _FUNC_HIGH:
            tags.append(w)
            break
    if not tags:
        for w in words:
            if w in _FUNC_LOW:
                tags.append(w)
                break

    # ② Management / leadership keyword (at most one, canonical form)
    _mgmt_canonical = {
        'lead': 'lead', 'leads': 'lead',
        'manager': 'manager', 'managers': 'manager',
        'head': 'head',
        'supervisor': 'supervisor',
        'owner': 'owner',
        'director': 'director',
        'principal': 'principal',
        'ראש': 'ראש', 'מנהל': 'מנהל', 'מנהלת': 'מנהל',
    }
    _tags_set = set(tags)
    for w in words:
        if w in _ROLE_MGMT_TAGS:
            canonical = _mgmt_canonical.get(w, w)
            if canonical not in _tags_set:
                tags.append(canonical)
            break

    return tags


def derive_role_type_tag(role_title: str) -> str | None:
    """Backward-compatible single-tag version — returns the first tag or None."""
    tags = derive_role_type_tags(role_title)
    return tags[0] if tags else None


def _extract_title_keywords(role_title: str) -> list[str]:
    """Extract meaningful technology/domain keywords from a job title, skipping generic words."""
    words = _normalize(role_title).split()
    return [
        w for w in words
        if (w in _SHORT_DOMAIN_ACRONYMS) or (len(w) >= 4 and w not in _TITLE_STOPWORDS)
    ]


def _role_title_match_score(candidate: dict, job_title: str) -> tuple[float, bool]:
    """
    Score how well the candidate's role history matches the TYPE of the job.

    Two signals are combined:
    1. Domain keywords (CRM, Dynamics, Salesforce…) must appear in a candidate role.
    2. Function-type cluster (analyst / developer / tester…) must be COMPATIBLE.
       e.g. "CRM Systems Analyst" and "CRM Developer" share the CRM domain but are
       in different function clusters → treated as NO match.

    Returns (score 0.0–1.0, was_meaningful).
    was_meaningful=False when the job title has no specific role-type keywords.

    Score interpretation:
      1.00 — current/most-recent role matches (domain + function)
      0.75 — matched one role ago
      0.50 — matched two roles ago
      0.20 — matched three+ roles ago
      0.05 — NO compatible match anywhere in career history  ← strong penalty
    """
    if not job_title:
        return 1.0, False

    # Domain/tech keywords (existing logic — function words filtered out)
    title_kws = _extract_title_keywords(job_title)

    # Function cluster of the job — derived from ALL normalised words in the title
    # so "analyst", "developer" etc. are visible here even though they're
    # stripped from title_kws for tech-matching purposes.
    job_words = _normalize(job_title).split()
    job_func = _func_cluster_from_words(job_words)

    if not title_kws:
        # No domain keywords — only meaningful when a HIGH-priority specific function
        # word is present (analyst, qa, designer, devops…).
        # Generic titles like "Senior Engineer" or "Software Developer" use only LOW-priority
        # words → treat as not meaningful (don't block any candidate type).
        # "Systems Analyst", "QA Lead", "UX Designer" → DO enforce function-type filtering.
        has_high_func = any(w in _FUNC_HIGH for w in job_words)
        if not has_high_func:
            return 1.0, False  # generic title, e.g. "Senior Engineer"

    # Build (normalized_title, position_index) list — current_role first, then all_roles
    roles: list[tuple[str, int]] = []
    current_role = _normalize(candidate.get("current_role") or "")
    if current_role:
        roles.append((current_role, 0))
    for i, role in enumerate(candidate.get("all_roles") or []):
        t = _normalize(role.get("title") if isinstance(role, dict) else str(role))
        if t:
            roles.append((t, i))

    if not roles:
        return 0.50, True  # No role history — benefit of the doubt

    best = 0.0
    for r_title, idx in roles:
        # ① Domain match: required only when domain keywords exist in the job title.
        #    If no domain keywords (e.g. "Systems Analyst"), skip domain check and rely
        #    on function-cluster filtering alone.
        if title_kws and not any(kw in r_title for kw in title_kws):
            continue

        # ② Function compatibility: if BOTH sides have a known function cluster
        #    and they differ → this role is the wrong type (analyst vs developer).
        #    Skip it entirely — don't award any credit.
        if job_func is not None:
            cand_func = _func_cluster_from_words(r_title.split())
            if cand_func is not None and cand_func != job_func:
                continue  # function-type mismatch — wrong role type

        s = _position_multiplier(idx)
        if s > best:
            best = s

    return (best if best > 0.0 else 0.05), True


def _tech_match(req_tech: str, candidate_techs: list, role_text: str = "") -> bool:
    """Check if a technology appears in the candidate's structured tech list or role titles."""
    r = _normalize(req_tech)
    for ct in candidate_techs:
        c = _normalize(str(ct))
        if r == c or r in c or c in r:
            return True
    # Fallback: role titles and company names only (not raw CV text — too broad)
    if role_text and r in role_text:
        return True
    return False


def _build_role_text(candidate: dict) -> str:
    """Build a compact text from role titles and company names only (no free-form CV text)."""
    all_roles = candidate.get("all_roles") or []
    roles_text = " ".join(
        r if isinstance(r, str) else " ".join(str(v) for v in r.values() if v)
        for r in all_roles
    )
    parts = [
        candidate.get("current_role") or "",
        candidate.get("current_company") or "",
        roles_text,
    ]
    return _normalize(" ".join(parts))


def _parse_end_year(years_str: str) -> int | None:
    """Extract end year from strings like '2019-2022', '2022-present', 'Jan 2020 – current'."""
    if not years_str:
        return None
    s = years_str.strip().lower()
    if any(w in s for w in ("present", "current", "today", "now", "היום", "כיום")):
        return CURRENT_YEAR
    # Grab all 4-digit years; last one is the end year
    years = re.findall(r'\b(20\d{2}|19\d{2})\b', s)
    if years:
        return int(years[-1])
    return None


def _recency_multiplier(years_ago: float) -> float:
    """Score multiplier based on how many years ago the relevant experience was."""
    if years_ago <= 1:
        return 1.00
    if years_ago <= 3:
        return 0.85
    if years_ago <= 5:
        return 0.60
    if years_ago <= 8:
        return 0.30
    if years_ago <= 12:
        return 0.10
    return 0.03


def _position_multiplier(idx: int) -> float:
    """Score multiplier based on how many roles ago the relevant experience was (0 = most recent)."""
    if idx == 0: return 1.00  # current / most recent role
    if idx == 1: return 0.95  # one role ago
    if idx == 2: return 0.80  # two roles ago
    if idx == 3: return 0.40  # three roles ago — significant drop
    return 0.20               # four+ roles ago — very significant drop


def _calc_recency(candidate: dict, job: dict) -> tuple[float, str | None]:
    """
    Find the most recent role where the candidate was doing work relevant to this job.
    Returns (multiplier 0.0–1.0, human-readable note or None).

    Combines two signals:
    1. Years-based recency (how long ago the role ended)
    2. Position-based recency (how many roles ago it was, newest=0)
    Final multiplier = min(years_mult, position_mult) — whichever is more restrictive.
    """
    required_techs = job.get("required_technologies") or []
    nice_techs     = job.get("nice_to_have") or []
    role_title     = job.get("role_title") or ""

    title_words  = [w for w in _normalize(role_title).split() if len(w) >= 4]
    tech_words   = [_normalize(t) for t in (required_techs + nice_techs) if t]
    all_keywords = title_words + tech_words

    if not all_keywords:
        return 1.0, None

    all_roles = candidate.get("all_roles") or []
    if not all_roles:
        return 0.75, None

    best_years_ago    = None
    best_position_idx = None
    best_role_title   = None

    for i, role in enumerate(all_roles):
        if isinstance(role, str):
            r_title = role
            r_years = ""
        elif isinstance(role, dict):
            r_title = role.get("title") or ""
            r_years = role.get("years") or ""
        else:
            continue

        r_norm = _normalize(r_title)
        if not r_norm:
            continue

        relevant = any(kw in r_norm or r_norm in kw for kw in all_keywords if kw)
        if not relevant:
            continue

        end_year = _parse_end_year(r_years)
        if end_year is None:
            end_year = CURRENT_YEAR - i * 2

        years_ago = max(0, CURRENT_YEAR - end_year)
        # Prefer the role that is most recent both in time and in position
        if best_years_ago is None or years_ago < best_years_ago:
            best_years_ago    = years_ago
            best_position_idx = i
            best_role_title   = r_title

    if best_years_ago is None:
        return 0.70, None

    years_mult    = _recency_multiplier(best_years_ago)
    position_mult = _position_multiplier(best_position_idx)
    multiplier    = min(years_mult, position_mult)  # most restrictive wins

    # Human-readable note
    if multiplier >= 0.95:
        note = None  # current / very recent — no warning needed
    elif best_position_idx >= 3:
        roles_ago = best_position_idx
        note = f"ניסיון רלוונטי לפני {roles_ago} תפקידים — {best_role_title} (לפני {best_years_ago} שנ')"
    elif best_years_ago <= 1:
        note = None
    elif best_years_ago <= 3:
        note = f"ניסיון רלוונטי לפני {best_years_ago} שנים ({best_role_title})"
    else:
        note = f"ניסיון רלוונטי לפני {best_years_ago} שנים — {best_role_title}"

    return multiplier, note


def _score(candidate: dict, job: dict) -> dict:
    required_techs = list(job.get("required_technologies") or [])
    nice_techs     = job.get("nice_to_have") or []
    min_exp        = float(job.get("min_experience_years") or 0)
    mgmt_required  = bool(job.get("management_required"))

    # When no explicit required technologies, derive implicit keywords from the job title.
    # This ensures a job like "SALESFORCE SYSTEM ANALYST" actually checks for Salesforce.
    title_derived = False
    if not required_techs and not nice_techs:
        title_kws = _extract_title_keywords(job.get("role_title") or "")
        if title_kws:
            required_techs = title_kws
            title_derived = True

    # Inject ALL role-type keywords as explicit tech requirements so that role-type
    # compatibility is directly reflected in the tech score and visible in results.
    # e.g. "QA Team Lead" injects ['qa', 'lead'] — candidates must have BOTH in their
    # role history to score full tech points.
    # The function-cluster system still provides the hard 48% cap; this adds finer scoring.
    _role_type_tags = derive_role_type_tags(job.get("role_title") or "")
    _role_type_injected: set[str] = set()
    if _role_type_tags:
        _norm_existing = {_normalize(t) for t in required_techs}
        _prefix: list[str] = []
        for _tag in _role_type_tags:
            if _tag not in _norm_existing:
                _prefix.append(_tag)
                _role_type_injected.add(_tag)
                _norm_existing.add(_tag)
        if _prefix:
            required_techs = _prefix + required_techs

    cand_techs = candidate.get("technologies") or []
    role_text  = _build_role_text(candidate)
    cand_years = float(candidate.get("total_experience_years") or 0)
    cand_mgmt  = bool(candidate.get("management_experience"))

    # ── Technology score ──────────────────────────────────
    if required_techs:
        matched_req = [t for t in required_techs if _tech_match(t, cand_techs, role_text)]
        missing_req = [t for t in required_techs if not _tech_match(t, cand_techs, role_text)]
        tech_score  = len(matched_req) / len(required_techs)
        # Title-derived keywords are a softer signal: cap the penalty so a partial
        # match (e.g., candidate has "salesforce" but not every single title word)
        # doesn't immediately sink the score.  We don't hard-gate on title-only keywords.
        if title_derived and tech_score < 0.5:
            tech_score = max(tech_score, 0.35)  # softer floor for implicit keywords
    elif nice_techs:
        matched_req = []
        missing_req = []
        tech_score  = len([t for t in nice_techs if _tech_match(t, cand_techs, role_text)]) / len(nice_techs)
    else:
        matched_req = []
        missing_req = []
        tech_score  = 1.0

    # ── Nice-to-have score (bonus, only when required_techs also defined) ─────
    if required_techs and nice_techs:
        matched_nice = [t for t in nice_techs if _tech_match(t, cand_techs, role_text)]
        nice_score   = len(matched_nice) / len(nice_techs)
    else:
        matched_nice = []
        nice_score   = 0.5  # neutral

    # ── Experience score ──────────────────────────────────
    if min_exp > 0:
        ratio     = cand_years / min_exp
        exp_score = min(1.0, ratio) if ratio >= 0.5 else max(0.0, ratio * 0.6)
    else:
        exp_score = 1.0

    # ── Management score ──────────────────────────────────
    mgmt_score = (1.0 if cand_mgmt else 0.0) if mgmt_required else 1.0

    # ── Recency factor ────────────────────────────────────
    recency_mult, recency_note = _calc_recency(candidate, job)
    # Apply recency to tech score only (experience years stay unaffected)
    effective_tech = tech_score * recency_mult

    # ── Role-type match (always computed) ─────────────────
    # Answers: "Is this candidate the right TYPE of professional?"
    # A Python developer should score low for a QA role even if they know
    # all the listed tools — role type carries 30% of the score.
    role_title = job.get("role_title") or ""
    role_score, role_meaningful = _role_title_match_score(candidate, role_title)

    # ── Weighted total ────────────────────────────────────
    if role_meaningful:
        # Role-type match is a decisive signal: 30% weight.
        # Tech / exp weights are reduced proportionally.
        raw = effective_tech * 0.40 + role_score * 0.30 + exp_score * 0.20 + nice_score * 0.05 + mgmt_score * 0.05
    else:
        # No domain-specific role keywords to check — original weights.
        raw = effective_tech * 0.55 + exp_score * 0.25 + nice_score * 0.10 + mgmt_score * 0.10

    # Hard gate: fewer than half of tech criteria matched → can't exceed 48%
    # (Title-derived keywords use a softer signal — skip hard gate for them)
    has_tech_criteria = bool(required_techs or nice_techs)
    if has_tech_criteria and not title_derived and effective_tech < 0.5:
        raw = min(raw, 0.48)

    # Hard cap for role-type mismatch: candidate has NEVER worked in this
    # type of role → cap score so they always fall below the default 60% threshold.
    if role_meaningful and role_score <= 0.05:
        raw = min(raw, 0.48)

    # Hard penalty: missing mandatory management requirement
    if mgmt_required and not cand_mgmt:
        raw *= 0.45

    match_pct = min(97, round(raw * 100))

    # ── Human-readable fields ─────────────────────────────
    advantages    = []
    disadvantages = []

    display_matched = matched_req if required_techs else (
        [t for t in nice_techs if _tech_match(t, cand_techs, role_text)] if nice_techs else []
    )
    if display_matched:
        label = "מילות מפתח רלוונטיות" if title_derived else "טכנולוגיות מתאימות"
        advantages.append(f"{label}: {', '.join(display_matched[:6])}")
    if min_exp > 0 and cand_years >= min_exp:
        advantages.append(f"{int(cand_years)} שנות ניסיון — עומד בדרישה")
    elif cand_years > 0 and min_exp == 0:
        advantages.append(f"{int(cand_years)} שנות ניסיון")
    if matched_nice:
        advantages.append(f"Nice to have: {', '.join(matched_nice[:4])}")
    if cand_mgmt and mgmt_required:
        advantages.append("יש ניסיון ניהולי")
    elif cand_mgmt:
        advantages.append("ניסיון ניהולי (בונוס)")

    # Role-type match feedback
    if role_meaningful:
        current = candidate.get("current_role") or ""
        if role_score >= 0.75:
            advantages.append(f"תפקיד תואם: {current}" if current else "תפקיד תואם לדרישה")
        elif role_score >= 0.20:
            advantages.append("ניסיון בתפקיד מסוג זה — לא בשנים האחרונות")
        else:
            disadvantages.append("אין ניסיון בתפקיד מסוג זה")

    if recency_note:
        disadvantages.append(recency_note)
    # Don't show title-derived keywords as "missing" — they're soft signals from the title.
    # Also exclude injected role-type tags: mismatch is already shown by function-cluster feedback.
    if missing_req and not title_derived:
        _display_missing = [r for r in missing_req if r not in _role_type_injected]
        if _display_missing:
            disadvantages.append(f"חסרות טכנולוגיות: {', '.join(_display_missing[:5])}")
    if min_exp > 0 and cand_years < min_exp:
        disadvantages.append(f"ניסיון {int(cand_years)} שנים — נדרש {int(min_exp)}")
    if mgmt_required and not cand_mgmt:
        disadvantages.append("אין ניסיון ניהולי — דרישת חובה")

    mgmt_note = (
        f"ניסיון ניהולי: {int(candidate.get('management_years') or 0)} שנים"
        if cand_mgmt else "אין ניסיון ניהולי"
    )
    exp_note = (
        f"{int(cand_years)} שנות ניסיון (נדרש {int(min_exp)})"
        if min_exp > 0 else f"{int(cand_years)} שנות ניסיון"
    )

    _rec_missing = [r for r in missing_req if r not in _role_type_injected] if missing_req else []
    if match_pct >= 80:
        rec = "מועמד מתאים מאוד — מומלץ לבדיקה מעמיקה עם ניתוח AI"
    elif match_pct >= 65:
        if not title_derived and _rec_missing:
            rec = f"מתאים חלקית — חסר: {', '.join(_rec_missing[:2])}"
        else:
            rec = "מתאים חלקית"
    elif match_pct >= 45:
        if not title_derived and _rec_missing:
            rec = f"התאמה חלקית — חסרות {len(_rec_missing)} טכנולוגיות נדרשות"
        else:
            rec = "התאמה חלקית — ניסיון לא עדכני"
    else:
        rec = "התאמה נמוכה — ניסיון רלוונטי ישן או חסרות דרישות מהותיות"

    return {
        "match_percentage":     match_pct,
        "advantages":           advantages,
        "disadvantages":        disadvantages,
        "missing_requirements": [] if title_derived else [r for r in missing_req if r not in _role_type_injected],
        "matching_technologies": display_matched,
        "management_note":      mgmt_note,
        "experience_note":      exp_note,
        "recommendation":       rec,
        "quick_match":          True,
    }


def quick_match(job: dict, candidates: list, min_match_pct: int = 30) -> list:
    """
    Score all candidates without any API calls.
    Returns all results above min_match_pct, sorted by score descending.
    """
    min_exp = float(job.get("min_experience_years") or 0)
    results = []

    for c in candidates:
        if min_exp > 0 and (c.get("total_experience_years") or 0) < max(0, min_exp - 7):
            continue
        scored = _score(c, job)
        if scored["match_percentage"] >= min_match_pct:
            results.append({**c, **scored})

    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return results
