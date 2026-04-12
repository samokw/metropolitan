"""
Discover LFS PUMF CSV ZIP URLs from Statistics Canada's product page and optional hist/ probes.

Used when STATCAN_LABOUR_PUMF_SOURCES contains the token ``discover`` so the ingester follows
what StatCan actually links, plus (by default) complete calendar years via hist/YYYY-CSV.zip when
those bundles exist. Optional Last-Modified tracking skips unchanged ZIPs between runs.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)

DEFAULT_LFS_PUMF_PRODUCT_PAGE = (
    "https://www150.statcan.gc.ca/n1/pub/71m0001x/71m0001x2021001-eng.htm"
)

DISCOVER_PAGE_TIMEOUT = 60
HEAD_PROBE_TIMEOUT = 45


def _truthy(raw: str | None, default: bool = False) -> bool:
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def env_truthy(name: str, default: bool = False) -> bool:
    return _truthy(os.getenv(name), default)


def discover_monthly_pumf_zip_urls(
    product_page_url: str = DEFAULT_LFS_PUMF_PRODUCT_PAGE,
    timeout: int = DISCOVER_PAGE_TIMEOUT,
) -> list[str]:
    """
    Fetch the English PUMF product page and collect linked monthly …/YYYY-MM-CSV.zip URLs.
    """
    logger.info("Discovering PUMF monthly links from %s", product_page_url)
    response = requests.get(product_page_url, timeout=timeout)
    response.raise_for_status()
    html = response.text
    seen: set[str] = set()
    out: list[str] = []
    for m in re.finditer(r"""href\s*=\s*["']([^"']+)["']""", html, re.I):
        href = m.group(1).strip()
        if "-CSV.zip" not in href:
            continue
        if not re.search(r"\d{4}-\d{2}-CSV\.zip\s*$", href, re.I):
            continue
        if "71m0001x" not in href.lower():
            continue
        full = urljoin(product_page_url, href)
        if full not in seen:
            seen.add(full)
            out.append(full)
    logger.info("Discovered %d monthly PUMF ZIP URL(s)", len(out))
    return out


def probe_hist_bundle_urls(
    base_url: str,
    min_year: int,
    max_year: int,
    timeout: int = HEAD_PROBE_TIMEOUT,
) -> list[str]:
    """
    HEAD each hist/YYYY-CSV.zip under base_url for min_year <= Y <= max_year; keep URLs that exist.
    """
    base_url = base_url.rstrip("/")
    if max_year < min_year:
        return []
    found: list[str] = []
    for y in range(min_year, max_year + 1):
        url = f"{base_url}/hist/{y}-CSV.zip"
        try:
            r = requests.head(url, timeout=timeout, allow_redirects=True)
            if r.status_code == 200:
                found.append(url)
                logger.info("hist bundle available: %s", url)
        except requests.RequestException as ex:
            logger.debug("hist probe skip %s: %s", url, ex)
    return found


def expand_discover_urls(base_url: str) -> list[str]:
    """
    Monthly links from the product page plus optional hist/ bundles for complete past years.
    """
    page = (os.getenv("STATCAN_LABOUR_PUMF_PRODUCT_PAGE_URL") or DEFAULT_LFS_PUMF_PRODUCT_PAGE).strip()
    out: list[str] = list(discover_monthly_pumf_zip_urls(page))
    if env_truthy("STATCAN_LABOUR_PUMF_AUTO_HIST", True):
        min_y = int(os.getenv("STATCAN_LABOUR_PUMF_AUTO_HIST_MIN_YEAR") or "2020")
        max_y = datetime.now(timezone.utc).year - 1
        hist_urls = probe_hist_bundle_urls(base_url, min_y, max_y)
        out.extend(hist_urls)
    return out


def _url_period_start(url: str) -> tuple[int, int]:
    """First (year, month) covered by this ZIP URL; hist/2025 -> (2025, 1)."""
    hm = re.search(r"/hist/(\d{4})-CSV\.zip", url, re.I)
    if hm:
        return (int(hm.group(1)), 1)
    mm = re.search(r"/(\d{4})-(\d{2})-CSV\.zip", url, re.I)
    if mm:
        return (int(mm.group(1)), int(mm.group(2)))
    # Full-URL overrides without a StatCan-style name sort after dated ZIPs.
    return (9999, 99)


def parse_min_reference(raw: str | None) -> tuple[int, int] | None:
    """``2025-01`` or ``2025`` -> (2025, 1)."""
    if not raw or not str(raw).strip():
        return None
    s = str(raw).strip()
    m = re.fullmatch(r"(\d{4})-(\d{2})", s)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    m = re.fullmatch(r"(\d{4})", s)
    if m:
        return (int(m.group(1)), 1)
    raise ValueError(
        f"Invalid STATCAN_LABOUR_PUMF_MIN_REFERENCE {raw!r}: use YYYY-MM or YYYY"
    )


def filter_urls_by_min_reference(urls: list[str], min_ref: str | None) -> list[str]:
    key = parse_min_reference(min_ref)
    if key is None:
        return urls
    return [u for u in urls if _url_period_start(u) >= key]


def dedupe_preserve_order(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def sort_pumf_urls(urls: list[str]) -> list[str]:
    return sorted(urls, key=lambda u: (_url_period_start(u), u))


def finalize_labour_pumf_url_list(urls: list[str]) -> list[str]:
    """Deduplicate, apply STATCAN_LABOUR_PUMF_MIN_REFERENCE, stable sort."""
    urls = dedupe_preserve_order(urls)
    min_ref = os.getenv("STATCAN_LABOUR_PUMF_MIN_REFERENCE", "").strip()
    urls = filter_urls_by_min_reference(urls, min_ref or None)
    return sort_pumf_urls(urls)


def pumf_zip_head_last_modified(url: str, timeout: int = HEAD_PROBE_TIMEOUT) -> str | None:
    """Return Last-Modified header if HEAD succeeds, else None."""
    try:
        r = requests.head(url, timeout=timeout, allow_redirects=True)
        if r.status_code != 200:
            return None
        return r.headers.get("Last-Modified")
    except requests.RequestException:
        return None


def default_sync_state_path() -> Path:
    raw = os.getenv("STATCAN_LABOUR_PUMF_SYNC_STATE_FILE", "pumf_wave_sync.json")
    return Path(raw).expanduser()


def load_pumf_wave_sync_state(path: Path | None = None) -> dict[str, str]:
    p = path or default_sync_state_path()
    if not p.is_file():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
    except (OSError, json.JSONDecodeError) as ex:
        logger.warning("Could not read PUMF sync state %s: %s", p, ex)
    return {}


def save_pumf_wave_sync_state(state: dict[str, str], path: Path | None = None) -> None:
    p = path or default_sync_state_path()
    try:
        p.write_text(json.dumps(state, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    except OSError as ex:
        logger.warning("Could not write PUMF sync state %s: %s", p, ex)
