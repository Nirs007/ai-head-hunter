import sqlite3
import json
import os
from datetime import datetime

# When packaged (launcher.py sets CV_MATCHER_DATA_DIR), store DB in user's AppData.
# When running from source, store next to this file (original behaviour).
_data_dir = os.environ.get('CV_MATCHER_DATA_DIR', os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(_data_dir, 'candidates.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_hash TEXT UNIQUE NOT NULL,
            file_path TEXT,
            file_name TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            current_role TEXT,
            current_company TEXT,
            all_roles TEXT,
            total_experience_years REAL,
            technologies TEXT,
            management_experience INTEGER DEFAULT 0,
            management_years REAL,
            management_scope TEXT,
            education TEXT,
            location TEXT,
            company_background TEXT,
            notable_companies TEXT,
            raw_summary TEXT,
            raw_summary_he TEXT,
            recommended_roles TEXT,
            processed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS scan_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_path TEXT,
            files_found INTEGER,
            files_processed INTEGER,
            duplicates_skipped INTEGER,
            errors INTEGER,
            started_at TEXT,
            finished_at TEXT
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            requirements TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS match_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            candidate_id INTEGER NOT NULL,
            job_title TEXT,
            job_requirements TEXT,
            match_percentage INTEGER,
            advantages TEXT,
            disadvantages TEXT,
            missing_requirements TEXT,
            recommendation TEXT,
            matched_at TEXT,
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        );

        CREATE TABLE IF NOT EXISTS match_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            ran_at TEXT,
            candidates_total INTEGER,
            candidates_checked INTEGER,
            matches_found INTEGER,
            min_match_pct INTEGER,
            FOREIGN KEY (job_id) REFERENCES jobs(id)
        );

        CREATE TABLE IF NOT EXISTS candidate_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL,
            note TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        );

        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            due_at TEXT NOT NULL,
            candidate_id INTEGER,
            job_id INTEGER,
            candidate_name TEXT DEFAULT '',
            job_title TEXT DEFAULT '',
            dismissed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)
    conn.commit()

    # Migration: add columns that may not exist in older databases
    migrations = [
        "ALTER TABLE jobs ADD COLUMN reference_number TEXT",
        "ALTER TABLE candidates ADD COLUMN cv_language TEXT DEFAULT 'en'",
        "ALTER TABLE candidates ADD COLUMN current_company TEXT",
        "ALTER TABLE candidates ADD COLUMN management_scope TEXT",
        "ALTER TABLE candidates ADD COLUMN company_background TEXT",
        "ALTER TABLE candidates ADD COLUMN notable_companies TEXT",
        "ALTER TABLE candidates ADD COLUMN raw_summary_he TEXT",
        "ALTER TABLE candidates ADD COLUMN recommended_roles TEXT",
        "ALTER TABLE match_history ADD COLUMN summaries TEXT",
        "ALTER TABLE match_history ADD COLUMN match_type TEXT",
        "ALTER TABLE match_history ADD COLUMN rejected INTEGER DEFAULT 0",
        "ALTER TABLE match_history ADD COLUMN rejection_reason TEXT",
        "ALTER TABLE match_history ADD COLUMN rejected_at TEXT",
        "ALTER TABLE match_history ADD COLUMN accepted INTEGER DEFAULT 0",
        "ALTER TABLE match_history ADD COLUMN acceptance_note TEXT",
        "ALTER TABLE match_history ADD COLUMN accepted_at TEXT",
        "ALTER TABLE match_history ADD COLUMN matching_technologies TEXT",
        "ALTER TABLE match_history ADD COLUMN experience_note TEXT",
        "ALTER TABLE match_history ADD COLUMN management_note TEXT",
        "ALTER TABLE jobs ADD COLUMN status TEXT DEFAULT 'active'",
        "ALTER TABLE jobs ADD COLUMN civi_id TEXT",
        "ALTER TABLE jobs ADD COLUMN civi_url TEXT",
        "ALTER TABLE candidates ADD COLUMN linkedin_url TEXT",
        "ALTER TABLE reminders ADD COLUMN assigned_user_id INTEGER",
        "ALTER TABLE reminders ADD COLUMN email_sent INTEGER DEFAULT 0",
        "ALTER TABLE reminders ADD COLUMN candidate_phone TEXT DEFAULT ''",
        "ALTER TABLE reminders ADD COLUMN email_error TEXT DEFAULT ''",
        # Item 1 — candidate extras
        "ALTER TABLE candidates ADD COLUMN salary_expectation TEXT",
        "ALTER TABLE candidates ADD COLUMN availability TEXT",
        "ALTER TABLE candidates ADD COLUMN call_notes TEXT",
        "ALTER TABLE users ADD COLUMN password_hash TEXT",
        """CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )""",
    ]
    for sql in migrations:
        try:
            c.execute(sql)
        except Exception:
            pass  # column already exists

    # Seed SMTP defaults for Google Workspace (connectech.co.il) if not yet configured
    smtp_host_exists = c.execute("SELECT 1 FROM app_settings WHERE key = 'smtp_host'").fetchone()
    if not smtp_host_exists:
        c.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", ("smtp_host", "smtp.gmail.com"))
        c.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", ("smtp_port", "587"))
        c.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", ("smtp_from_name", "AI Head Hunter | ConnecTech"))
        c.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", ("smtp_user", ""))
        c.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)", ("smtp_pass", ""))

    # Seed initial users if table is empty
    count = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        now = datetime.utcnow().isoformat()
        c.execute(
            "INSERT INTO users (name, role, email, phone, created_at) VALUES (?, ?, ?, ?, ?)",
            ("עופרי", "רקרוטר", "ofri@connectech.co.il", "", now),
        )
        c.execute(
            "INSERT INTO users (name, role, email, phone, created_at) VALUES (?, ?, ?, ?, ?)",
            ("משתמש", "מנהל", "", "", now),
        )

    # Ensure admin user nirs@connectech.co.il always exists with password
    _ADMIN_EMAIL = "nirs@connectech.co.il"
    _ADMIN_HASH  = "$2b$12$BcBJNKjLZDtAM//Lq/3QP.OwseHRUxItvshfdcJDlOud73Q4eNL0q"
    existing_admin = c.execute(
        "SELECT id, password_hash FROM users WHERE LOWER(email)=?", (_ADMIN_EMAIL,)
    ).fetchone()
    if existing_admin is None:
        c.execute(
            "INSERT INTO users (name, role, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("ניר שניצר", "מנהל", _ADMIN_EMAIL, "", _ADMIN_HASH, datetime.utcnow().isoformat()),
        )
    elif not existing_admin[1]:
        c.execute("UPDATE users SET password_hash=? WHERE LOWER(email)=?", (_ADMIN_HASH, _ADMIN_EMAIL))

    # One-time cleanup: remove duplicate match_history rows, keep latest per (candidate_id, job_id)
    c.execute("""
        DELETE FROM match_history
        WHERE id NOT IN (
            SELECT MAX(id) FROM match_history
            GROUP BY candidate_id, job_id
        )
    """)
    conn.commit()
    conn.close()


def hash_exists(file_hash: str) -> bool:
    conn = get_conn()
    row = conn.execute(
        "SELECT 1 FROM candidates WHERE file_hash = ?", (file_hash,)
    ).fetchone()
    conn.close()
    return row is not None


def get_all_hashes() -> set:
    """Return all known file hashes as a set (for fast delta scanning)."""
    conn = get_conn()
    rows = conn.execute("SELECT file_hash FROM candidates").fetchall()
    conn.close()
    return {r[0] for r in rows if r[0]}


def update_candidate_name(candidate_id: int, name: str):
    conn = get_conn()
    conn.execute("UPDATE candidates SET name = ? WHERE id = ?", (name, candidate_id))
    conn.commit()
    conn.close()


def update_candidate_extras(candidate_id: int, salary_expectation=None, availability=None, call_notes=None):
    """Update salary_expectation, availability, and/or call_notes for a candidate."""
    fields, values = [], []
    if salary_expectation is not None:
        fields.append("salary_expectation = ?"); values.append(salary_expectation)
    if availability is not None:
        fields.append("availability = ?"); values.append(availability)
    if call_notes is not None:
        fields.append("call_notes = ?"); values.append(call_notes)
    if not fields:
        return
    values.append(candidate_id)
    conn = get_conn()
    conn.execute(f"UPDATE candidates SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()


def candidate_exists_by_identity(name: str, email: str) -> dict | None:
    """Check if a candidate with same name+email already exists (near-duplicate)."""
    if not name or not email:
        return None
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM candidates WHERE LOWER(name) = LOWER(?) AND LOWER(email) = LOWER(?)",
        (name.strip(), email.strip()),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def insert_candidate(data: dict):
    conn = get_conn()
    conn.execute(
        """
        INSERT OR IGNORE INTO candidates
        (file_hash, file_path, file_name, name, email, phone,
         current_role, current_company, all_roles, total_experience_years,
         technologies, management_experience, management_years, management_scope,
         education, location, company_background, notable_companies, raw_summary, raw_summary_he,
         recommended_roles, cv_language, linkedin_url, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("file_hash"),
            data.get("file_path"),
            data.get("file_name"),
            data.get("name"),
            data.get("email"),
            data.get("phone"),
            data.get("current_role"),
            data.get("current_company"),
            json.dumps(data.get("all_roles") or [], ensure_ascii=False),
            data.get("total_experience_years"),
            json.dumps(data.get("technologies") or [], ensure_ascii=False),
            1 if data.get("management_experience") else 0,
            data.get("management_years"),
            data.get("management_scope"),
            data.get("education"),
            data.get("location"),
            data.get("company_background"),
            json.dumps(data.get("notable_companies") or [], ensure_ascii=False),
            data.get("raw_summary"),
            data.get("raw_summary_he"),
            json.dumps(data.get("recommended_roles") or [], ensure_ascii=False),
            data.get("cv_language") or "en",
            data.get("linkedin_url") or None,
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def get_candidates_for_reprocess() -> list[dict]:
    """Return candidates without cv_language set (old candidates needing re-extraction)."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, name, file_path, file_name FROM candidates WHERE (cv_language IS NULL OR cv_language = 'en') AND file_path IS NOT NULL AND file_path != '' AND name NOT LIKE '% (dup)'"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_candidate_extracted(candidate_id: int, data: dict):
    """Update extracted fields for a candidate after re-processing."""
    conn = get_conn()
    conn.execute(
        """UPDATE candidates SET
           name = ?, current_role = ?, current_company = ?, all_roles = ?,
           total_experience_years = ?, technologies = ?,
           management_experience = ?, management_years = ?, management_scope = ?,
           education = ?, location = ?, company_background = ?,
           notable_companies = ?, raw_summary = ?, raw_summary_he = ?,
           recommended_roles = ?, cv_language = ?, linkedin_url = ?, processed_at = ?
           WHERE id = ?""",
        (
            data.get("name"),
            data.get("current_role"),
            data.get("current_company"),
            json.dumps(data.get("all_roles") or [], ensure_ascii=False),
            data.get("total_experience_years"),
            json.dumps(data.get("technologies") or [], ensure_ascii=False),
            1 if data.get("management_experience") else 0,
            data.get("management_years"),
            data.get("management_scope"),
            data.get("education"),
            data.get("location"),
            data.get("company_background"),
            json.dumps(data.get("notable_companies") or [], ensure_ascii=False),
            data.get("raw_summary"),
            data.get("raw_summary_he"),
            json.dumps(data.get("recommended_roles") or [], ensure_ascii=False),
            data.get("cv_language") or "en",
            data.get("linkedin_url") or None,
            datetime.utcnow().isoformat(),
            candidate_id,
        ),
    )
    conn.commit()
    conn.close()


def update_candidate_language(candidate_id: int, cv_language: str):
    """Update only the cv_language field for a candidate."""
    conn = get_conn()
    conn.execute("UPDATE candidates SET cv_language = ? WHERE id = ?", (cv_language, candidate_id))
    conn.commit()
    conn.close()


def get_candidates_missing_he_summary() -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, name, raw_summary FROM candidates WHERE (raw_summary_he IS NULL OR raw_summary_he = '') AND raw_summary IS NOT NULL AND raw_summary != ''"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_summary_he(candidate_id: int, summary_he: str):
    conn = get_conn()
    conn.execute("UPDATE candidates SET raw_summary_he = ? WHERE id = ?", (summary_he, candidate_id))
    conn.commit()
    conn.close()


def get_candidate_by_id(candidate_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
    conn.close()
    if not row:
        return None
    c = dict(row)
    c["all_roles"] = json.loads(c.get("all_roles") or "[]")
    c["technologies"] = json.loads(c.get("technologies") or "[]")
    c["notable_companies"] = json.loads(c.get("notable_companies") or "[]")
    c["recommended_roles"] = json.loads(c.get("recommended_roles") or "[]")
    c["management_experience"] = bool(c.get("management_experience"))
    return c


def get_job_by_id(job_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    if not row:
        return None
    j = dict(row)
    j["requirements"] = json.loads(j.get("requirements") or "{}")
    return j


def get_all_candidates() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM candidates WHERE name NOT LIKE '% (dup)' ORDER BY name").fetchall()
    conn.close()
    result = []
    for row in rows:
        c = dict(row)
        c["all_roles"] = json.loads(c.get("all_roles") or "[]")
        c["technologies"] = json.loads(c.get("technologies") or "[]")
        c["notable_companies"] = json.loads(c.get("notable_companies") or "[]")
        c["recommended_roles"] = json.loads(c.get("recommended_roles") or "[]")
        c["management_experience"] = bool(c.get("management_experience"))
        result.append(c)
    return result


def get_stats() -> dict:
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM candidates WHERE name NOT LIKE '% (dup)'").fetchone()[0]
    last_scan = conn.execute(
        "SELECT * FROM scan_log ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return {
        "total_candidates": total,
        "last_scan": dict(last_scan) if last_scan else None,
    }


def count_jobs_today() -> int:
    """Count jobs created today (by local date)."""
    conn = get_conn()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    row = conn.execute(
        "SELECT COUNT(*) FROM jobs WHERE created_at LIKE ?", (today + "%",)
    ).fetchone()
    conn.close()
    return row[0] if row else 0


def save_job(title: str, requirements: dict, reference_number: str = "") -> int:
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO jobs (title, requirements, created_at, reference_number) VALUES (?, ?, ?, ?)",
        (title, json.dumps(requirements, ensure_ascii=False), datetime.utcnow().isoformat(), reference_number),
    )
    job_id = cur.lastrowid
    conn.commit()
    conn.close()
    return job_id


def get_all_jobs() -> list[dict]:
    """Return active and frozen jobs (excludes pending and closed)."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM jobs WHERE (status IS NULL OR status IN ('active','frozen')) ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        j = dict(row)
        j["requirements"] = json.loads(j.get("requirements") or "{}")
        result.append(j)
    return result


def get_pending_jobs() -> list[dict]:
    """Return jobs imported from Civi that are awaiting user approval."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        j = dict(row)
        j["requirements"] = json.loads(j.get("requirements") or "{}")
        result.append(j)
    return result


def save_pending_job(title: str, civi_id: str, civi_url: str) -> int:
    """
    Save a job from Civi with status='pending'.
    Returns the new job id, or 0 if this civi_id already exists.
    """
    conn = get_conn()
    existing = conn.execute("SELECT id FROM jobs WHERE civi_id = ?", (civi_id,)).fetchone()
    if existing:
        conn.close()
        return 0
    cur = conn.execute(
        "INSERT INTO jobs (title, requirements, status, civi_id, civi_url, created_at) VALUES (?,?,?,?,?,?)",
        (title, "{}", "pending", civi_id, civi_url, datetime.utcnow().isoformat()),
    )
    job_id = cur.lastrowid
    conn.commit()
    conn.close()
    return job_id


def update_job_status(job_id: int, status: str):
    """Update the status of a job (active / frozen / closed / pending)."""
    conn = get_conn()
    conn.execute("UPDATE jobs SET status = ? WHERE id = ?", (status, job_id))
    conn.commit()
    conn.close()


def approve_pending_job(job_id: int, title: str, requirements: dict):
    """Set a pending job to active with analysed requirements."""
    conn = get_conn()
    conn.execute(
        "UPDATE jobs SET title = ?, requirements = ?, status = 'active' WHERE id = ?",
        (title, json.dumps(requirements, ensure_ascii=False), job_id),
    )
    conn.commit()
    conn.close()


def update_job(job_id: int, title: str, requirements: dict):
    conn = get_conn()
    conn.execute(
        "UPDATE jobs SET title = ?, requirements = ? WHERE id = ?",
        (title, json.dumps(requirements, ensure_ascii=False), job_id),
    )
    conn.commit()
    conn.close()


def delete_job(job_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM match_history WHERE job_id = ?", (job_id,))
    conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()


def clear_job_history(job_id: int):
    """Delete match history for a job, but KEEP rejection and acceptance decisions."""
    conn = get_conn()
    conn.execute(
        "DELETE FROM match_history WHERE job_id = ? AND (rejected IS NULL OR rejected = 0) AND (accepted IS NULL OR accepted = 0)",
        (job_id,),
    )
    conn.commit()
    conn.close()


def clear_all_history():
    """Delete all match history rows across all jobs, but KEEP rejection and acceptance decisions."""
    conn = get_conn()
    conn.execute(
        "DELETE FROM match_history WHERE (rejected IS NULL OR rejected = 0) AND (accepted IS NULL OR accepted = 0)"
    )
    conn.commit()
    conn.close()


def get_matched_candidate_ids(job_id: int) -> set:
    """Return the set of candidate IDs already recorded in match_history for this job."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT candidate_id FROM match_history WHERE job_id = ?", (job_id,)
    ).fetchall()
    conn.close()
    return {r[0] for r in rows}


def get_job_matches(job_id: int) -> list[dict]:
    conn = get_conn()
    # Keep only the latest entry per candidate per job (dedup by MAX(id))
    rows = conn.execute(
        """SELECT mh.*,
                  c.name, c.current_role, c.current_company, c.file_path, c.file_name,
                  c.email, c.phone, c.total_experience_years, c.all_roles, c.technologies,
                  c.management_experience, c.management_years, c.management_scope,
                  c.location, c.company_background, c.notable_companies, c.education,
                  c.recommended_roles, c.raw_summary, c.raw_summary_he, c.cv_language
           FROM match_history mh
           JOIN candidates c ON c.id = mh.candidate_id
           WHERE mh.job_id = ?
             AND mh.rejected != 1
             AND mh.id = (
               SELECT MAX(id) FROM match_history
               WHERE candidate_id = mh.candidate_id AND job_id = mh.job_id
             )
           ORDER BY mh.accepted DESC, mh.match_percentage DESC""",
        (job_id,),
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        h = dict(row)
        h["advantages"]           = json.loads(h.get("advantages") or "[]")
        h["disadvantages"]        = json.loads(h.get("disadvantages") or "[]")
        h["missing_requirements"] = json.loads(h.get("missing_requirements") or "[]")
        h["summaries"]            = json.loads(h.get("summaries") or "{}")
        h["all_roles"]            = json.loads(h.get("all_roles") or "[]")
        h["technologies"]         = json.loads(h.get("technologies") or "[]")
        h["notable_companies"]    = json.loads(h.get("notable_companies") or "[]")
        h["recommended_roles"]    = json.loads(h.get("recommended_roles") or "[]")
        h["management_experience"] = bool(h.get("management_experience"))
        result.append(h)
    return result


def reject_candidate_for_job(job_id: int, candidate_id: int, reason: str):
    """Mark a candidate as rejected for a specific job, with a reason."""
    conn = get_conn()
    conn.execute(
        """UPDATE match_history SET rejected = 1, rejection_reason = ?, rejected_at = ?
           WHERE job_id = ? AND candidate_id = ?""",
        (reason.strip(), datetime.utcnow().isoformat(), job_id, candidate_id),
    )
    conn.commit()
    conn.close()


def get_rejected_candidate_ids(job_id: int) -> set:
    """Return the set of candidate IDs that were rejected for this job."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT candidate_id FROM match_history WHERE job_id = ? AND rejected = 1",
        (job_id,),
    ).fetchall()
    conn.close()
    return {row["candidate_id"] for row in rows}


def get_rejections_for_job(job_id: int) -> list[dict]:
    """Return rejected candidates with names and reasons — used as matching context."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT mh.candidate_id, c.name, mh.rejection_reason
           FROM match_history mh
           JOIN candidates c ON c.id = mh.candidate_id
           WHERE mh.job_id = ? AND mh.rejected = 1""",
        (job_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_accepted_candidates_full(job_id: int) -> list[dict]:
    """Return full candidate profiles for all accepted candidates for a job.
    Used to force-include them in new match results regardless of score."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT mh.candidate_id, mh.match_percentage, mh.match_type,
                  mh.advantages, mh.disadvantages, mh.missing_requirements,
                  mh.recommendation, mh.acceptance_note, mh.summaries,
                  c.id, c.name, c.current_role, c.current_company,
                  c.file_path, c.file_name, c.email, c.phone,
                  c.total_experience_years, c.all_roles, c.technologies,
                  c.management_experience, c.management_years, c.management_scope,
                  c.location, c.company_background, c.notable_companies,
                  c.education, c.recommended_roles, c.raw_summary, c.raw_summary_he,
                  c.cv_language
           FROM match_history mh
           JOIN candidates c ON c.id = mh.candidate_id
           WHERE mh.job_id = ? AND mh.accepted = 1""",
        (job_id,),
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        h = dict(row)
        h["id"]                   = h["candidate_id"]
        h["accepted"]             = True
        h["advantages"]           = json.loads(h.get("advantages") or "[]")
        h["disadvantages"]        = json.loads(h.get("disadvantages") or "[]")
        h["missing_requirements"] = json.loads(h.get("missing_requirements") or "[]")
        h["summaries"]            = json.loads(h.get("summaries") or "{}")
        h["all_roles"]            = json.loads(h.get("all_roles") or "[]")
        h["technologies"]         = json.loads(h.get("technologies") or "[]")
        h["notable_companies"]    = json.loads(h.get("notable_companies") or "[]")
        h["recommended_roles"]    = json.loads(h.get("recommended_roles") or "[]")
        h["management_experience"] = bool(h.get("management_experience"))
        result.append(h)
    return result


def get_accepted_info_for_job(job_id: int) -> dict:
    """Return {candidate_id: acceptance_note} for all accepted candidates for this job."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT candidate_id, acceptance_note FROM match_history WHERE job_id = ? AND accepted = 1",
        (job_id,),
    ).fetchall()
    conn.close()
    return {row["candidate_id"]: (row["acceptance_note"] or "") for row in rows}


def accept_candidate_for_job(job_id: int, candidate_id: int, note: str):
    """Mark a candidate as accepted for a specific job, with an optional note."""
    conn = get_conn()
    conn.execute(
        """UPDATE match_history SET accepted = 1, acceptance_note = ?, accepted_at = ?
           WHERE job_id = ? AND candidate_id = ?""",
        (note.strip(), datetime.utcnow().isoformat(), job_id, candidate_id),
    )
    conn.commit()
    conn.close()


def remove_candidate_from_job(job_id: int, candidate_id: int):
    """Fully remove a candidate from a job's match history (delete the row)."""
    conn = get_conn()
    conn.execute(
        "DELETE FROM match_history WHERE job_id = ? AND candidate_id = ?",
        (job_id, candidate_id),
    )
    conn.commit()
    conn.close()


def save_match_result(candidate_id: int, job_id: int, job_title: str, job_requirements: dict, result: dict, summaries: dict | None = None, match_type: str = "batch"):
    conn = get_conn()
    # Skip if this candidate+job pair already exists in history (prevent duplicates)
    existing = conn.execute(
        "SELECT 1 FROM match_history WHERE candidate_id = ? AND job_id = ?",
        (candidate_id, job_id),
    ).fetchone()
    if existing:
        conn.close()
        return
    conn.execute(
        """INSERT INTO match_history
           (job_id, candidate_id, job_title, job_requirements, match_percentage,
            advantages, disadvantages, missing_requirements, recommendation, summaries, match_type, matched_at,
            matching_technologies, experience_note, management_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            job_id,
            candidate_id,
            job_title,
            json.dumps(job_requirements, ensure_ascii=False),
            result.get("match_percentage"),
            json.dumps(result.get("advantages") or [], ensure_ascii=False),
            json.dumps(result.get("disadvantages") or [], ensure_ascii=False),
            json.dumps(result.get("missing_requirements") or [], ensure_ascii=False),
            result.get("recommendation"),
            json.dumps(summaries, ensure_ascii=False) if summaries else None,
            match_type,
            datetime.utcnow().isoformat(),
            json.dumps(result.get("matching_technologies") or [], ensure_ascii=False),
            result.get("experience_note") or "",
            result.get("management_note") or "",
        ),
    )
    conn.commit()
    conn.close()


def log_match_run(job_id: int, candidates_total: int, candidates_checked: int, matches_found: int, min_match_pct: int):
    conn = get_conn()
    conn.execute(
        """INSERT INTO match_runs (job_id, ran_at, candidates_total, candidates_checked, matches_found, min_match_pct)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (job_id, datetime.utcnow().isoformat(), candidates_total, candidates_checked, matches_found, min_match_pct),
    )
    conn.commit()
    conn.close()


def get_match_runs(job_id: int) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM match_runs WHERE job_id = ? ORDER BY ran_at DESC LIMIT 20",
        (job_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_candidate_history(candidate_id: int) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM match_history WHERE candidate_id = ? ORDER BY matched_at DESC",
        (candidate_id,),
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        h = dict(row)
        h["advantages"]            = json.loads(h.get("advantages") or "[]")
        h["disadvantages"]         = json.loads(h.get("disadvantages") or "[]")
        h["missing_requirements"]  = json.loads(h.get("missing_requirements") or "[]")
        h["matching_technologies"] = json.loads(h.get("matching_technologies") or "[]")
        h["job_requirements"]      = json.loads(h.get("job_requirements") or "{}")
        h["summaries"]             = json.loads(h.get("summaries") or "{}")
        result.append(h)
    return result


def add_reminder(title: str, description: str, due_at: str,
                  candidate_id: int | None = None, job_id: int | None = None,
                  candidate_name: str = '', job_title: str = '',
                  assigned_user_id: int | None = None,
                  candidate_phone: str = '') -> dict:
    conn = get_conn()
    created_at = datetime.utcnow().isoformat()
    cur = conn.execute(
        """INSERT INTO reminders (title, description, due_at, candidate_id, job_id,
           candidate_name, job_title, dismissed, created_at, assigned_user_id, email_sent,
           candidate_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?)""",
        (title.strip(), description.strip(), due_at, candidate_id, job_id,
         candidate_name.strip(), job_title.strip(), created_at, assigned_user_id,
         (candidate_phone or '').strip()),
    )
    rid = cur.lastrowid
    conn.commit()
    conn.close()
    return {"id": rid, "title": title.strip(), "description": description.strip(),
            "due_at": due_at, "candidate_id": candidate_id, "job_id": job_id,
            "candidate_name": candidate_name.strip(), "job_title": job_title.strip(),
            "dismissed": 0, "created_at": created_at, "assigned_user_id": assigned_user_id,
            "email_sent": 0, "email_error": "", "candidate_phone": (candidate_phone or '').strip()}


def get_reminders(include_dismissed: bool = True) -> list[dict]:
    conn = get_conn()
    sql = "SELECT * FROM reminders"
    if not include_dismissed:
        sql += " WHERE dismissed = 0"
    sql += " ORDER BY dismissed ASC, due_at ASC"
    rows = conn.execute(sql).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_reminder(reminder_id: int, title: str, description: str, due_at: str,
                     candidate_name: str = '', candidate_phone: str = '',
                     job_id: int | None = None, job_title: str = '',
                     assigned_user_id: int | None = None) -> dict | None:
    conn = get_conn()
    conn.execute(
        """UPDATE reminders
           SET title = ?, description = ?, due_at = ?,
               candidate_name = ?, candidate_phone = ?,
               job_id = ?, job_title = ?,
               assigned_user_id = ?, email_sent = 0, email_error = ''
           WHERE id = ? AND dismissed = 0""",
        (title.strip(), description.strip(), due_at,
         candidate_name.strip(), (candidate_phone or '').strip(),
         job_id, job_title.strip(),
         assigned_user_id, reminder_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def dismiss_reminder(reminder_id: int):
    conn = get_conn()
    conn.execute("UPDATE reminders SET dismissed = 1 WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()


def delete_reminder(reminder_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()


def get_due_reminders() -> list[dict]:
    """Return undismissed reminders whose due_at is now or in the past."""
    conn = get_conn()
    now = datetime.utcnow().isoformat()
    rows = conn.execute(
        "SELECT * FROM reminders WHERE dismissed = 0 AND due_at <= ? ORDER BY due_at ASC",
        (now,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_due_reminders_for_email() -> list[dict]:
    """Return undismissed, unsent, non-failed reminders with an assigned user that are due now."""
    conn = get_conn()
    now = datetime.utcnow().isoformat()
    rows = conn.execute(
        """SELECT r.*, u.name AS user_name, u.email AS user_email
           FROM reminders r
           JOIN users u ON u.id = r.assigned_user_id
           WHERE r.dismissed = 0 AND r.email_sent = 0
             AND (r.email_error IS NULL OR r.email_error = '')
             AND r.due_at <= ? AND u.email != ''
           ORDER BY r.due_at ASC""",
        (now,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def mark_email_sent(reminder_id: int):
    conn = get_conn()
    conn.execute("UPDATE reminders SET email_sent = 1, email_error = '' WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()


def mark_email_failed(reminder_id: int, error_msg: str):
    conn = get_conn()
    conn.execute("UPDATE reminders SET email_error = ? WHERE id = ?", (error_msg, reminder_id))
    conn.commit()
    conn.close()


# ─── Users ────────────────────────────────────────────────────────────────────

def get_users() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM users ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def add_user(name: str, role: str, email: str, phone: str) -> dict:
    conn = get_conn()
    created_at = datetime.utcnow().isoformat()
    cur = conn.execute(
        "INSERT INTO users (name, role, email, phone, created_at) VALUES (?, ?, ?, ?, ?)",
        (name.strip(), role.strip(), email.strip(), phone.strip(), created_at),
    )
    uid = cur.lastrowid
    conn.commit()
    conn.close()
    return {"id": uid, "name": name.strip(), "role": role.strip(),
            "email": email.strip(), "phone": phone.strip(), "created_at": created_at}


def update_user(user_id: int, name: str, role: str, email: str, phone: str):
    conn = get_conn()
    conn.execute(
        "UPDATE users SET name = ?, role = ?, email = ?, phone = ? WHERE id = ?",
        (name.strip(), role.strip(), email.strip(), phone.strip(), user_id),
    )
    conn.commit()
    conn.close()


def delete_user(user_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_user_password(user_id: int, password_hash: str):
    conn = get_conn()
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
    conn.commit()
    conn.close()


def any_user_has_password() -> bool:
    conn = get_conn()
    row = conn.execute("SELECT 1 FROM users WHERE password_hash IS NOT NULL AND password_hash != ''").fetchone()
    conn.close()
    return row is not None


# ─── Password reset tokens ────────────────────────────────────────────────────

def create_reset_token(user_id: int, token: str, expires_at: str):
    conn = get_conn()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at) VALUES (?,?,?,0,?)",
        (user_id, token, expires_at, now)
    )
    conn.commit()
    conn.close()


def get_reset_token(token: str) -> dict | None:
    conn = get_conn()
    now = datetime.utcnow().isoformat()
    row = conn.execute(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?",
        (token, now),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_reset_token_used(token_id: int):
    conn = get_conn()
    conn.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (token_id,))
    conn.commit()
    conn.close()


# ─── App settings (key-value store) ──────────────────────────────────────────

def get_setting(key: str, default: str = "") -> str:
    conn = get_conn()
    row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row[0] if row else default


def set_setting(key: str, value: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    conn.commit()
    conn.close()


def add_candidate_note(candidate_id: int, note: str, author: str) -> dict:
    conn = get_conn()
    created_at = datetime.utcnow().isoformat()
    cur = conn.execute(
        "INSERT INTO candidate_notes (candidate_id, note, author, created_at) VALUES (?, ?, ?, ?)",
        (candidate_id, note.strip(), author.strip(), created_at),
    )
    note_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {"id": note_id, "candidate_id": candidate_id, "note": note.strip(), "author": author.strip(), "created_at": created_at}


def get_candidate_notes(candidate_id: int) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM candidate_notes WHERE candidate_id = ? ORDER BY created_at DESC",
        (candidate_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_candidate_note(note_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM candidate_notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()


def log_scan(folder_path, files_found, files_processed, duplicates_skipped, errors, started_at):
    conn = get_conn()
    conn.execute(
        """INSERT INTO scan_log
           (folder_path, files_found, files_processed, duplicates_skipped, errors, started_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (folder_path, files_found, files_processed, duplicates_skipped, errors,
         started_at, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
