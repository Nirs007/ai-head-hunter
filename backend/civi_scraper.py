"""
civi_scraper.py — Scrape job listings from Civi (app.civi.co.il).
HTML structure: <div class='thumb-content' onclick='openPromo(event,JOB_ID,SRC,1)'>
                  <div class='title' dir='rtl'>Job Title</div>
                </div>
"""

import html
import logging
import re
import urllib.request

logger = logging.getLogger(__name__)

COMPANY_ID  = "HF5MBS2H33"
SOURCE_ID   = "7118"
LISTING_URL = f"https://app.civi.co.il/promos/id={COMPANY_ID}&src={SOURCE_ID}&r=1000"
JOB_URL_TPL = f"https://app.civi.co.il/promo/id={{civi_id}}&src={SOURCE_ID}"

_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def _fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def scrape_civi_jobs() -> list[dict]:
    """
    Scrape all jobs from Civi company listing page.
    Returns list of {civi_id, title, url}.
    """
    raw = _fetch(LISTING_URL)
    jobs = []
    seen = set()

    # Each job block: onclick='openPromo(event,JOB_ID,SRC_ID,BUTTON)'
    # followed shortly by: <div class='title' dir='rtl'>TITLE</div>
    for m in re.finditer(r"openPromo\(event,(\d+),\d+,\d+\)", raw):
        civi_id = m.group(1)
        if civi_id in seen:
            continue
        seen.add(civi_id)

        # Look for title div within 800 chars after the onclick
        window = raw[m.start(): m.start() + 800]
        title_m = re.search(
            r"<div\s+class=['\"]title['\"][^>]*>\s*([^<]{2,150})\s*</div>",
            window, re.IGNORECASE
        )
        if title_m:
            raw_title = title_m.group(1).strip()
            title = html.unescape(raw_title)
            # Strip common prefix "דרוש/ה " or "דרושים/ות "
            title = re.sub(r"^דרוש[^–\s]*[\s/\u05d4]*", "", title).strip()
            title = title or raw_title
        else:
            title = f"משרה {civi_id}"

        jobs.append({
            "civi_id": civi_id,
            "title":   title,
            "url":     JOB_URL_TPL.format(civi_id=civi_id),
        })

    logger.info("Scraped %d jobs from Civi listing", len(jobs))
    return jobs
