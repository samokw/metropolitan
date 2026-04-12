"""
Extract stage: download ZIP archives from Statistics Canada and extract CSVs.
"""

import io
import csv
import zipfile
import logging
import requests

logger = logging.getLogger(__name__)

DOWNLOAD_TIMEOUT = 120
# Annual/hist PUMF bundles (e.g. hist/2025-CSV.zip) are large multi-file archives.
LABOUR_PUMF_DOWNLOAD_TIMEOUT = 600


def _list_pumf_pub_csv_members(namelist: list[str]) -> list[str]:
    """Paths to LFS PUMF microdata CSVs (pubMMYY.csv), excluding Documents/codebooks."""
    out: list[str] = []
    for name in namelist:
        if not name.lower().endswith(".csv"):
            continue
        pl = name.lower()
        if (
            "codebook" in pl
            or "/documents/" in pl
            or pl.startswith("documents/")
            or "metadata" in pl
        ):
            continue
        base = name.rsplit("/", 1)[-1].lower()
        if base.startswith("pub"):
            out.append(name)
    return sorted(out)


def _select_statcan_csv_member(namelist: list[str]) -> str | None:
    """
    PUMF ZIPs often include Documents/*codebook*.csv; the microdata file is usually pubMMYY.csv.
    Housing / table ZIPs typically have a single obvious CSV — we still skip codebooks.
    """
    csvs = [f for f in namelist if f.lower().endswith(".csv")]
    if not csvs:
        return None

    def is_doc_or_meta(path: str) -> bool:
        pl = path.lower()
        return (
            "metadata" in pl
            or "codebook" in pl
            or "/documents/" in pl
            or pl.startswith("documents/")
        )

    data_csvs = [f for f in csvs if not is_doc_or_meta(f)]
    if not data_csvs:
        data_csvs = csvs

    pub = [f for f in data_csvs if f.rsplit("/", 1)[-1].lower().startswith("pub")]
    if pub:
        return sorted(pub)[0]
    return sorted(data_csvs)[0]


def download_and_extract_csv(url, encoding="utf-8-sig"):
    """
    Download a ZIP from the given URL and extract the first CSV file.

    Returns:
        tuple: (rows as list of dicts, byte count of the downloaded ZIP)

    Raises:
        RuntimeError: if download fails or ZIP contains no CSV.
    """
    logger.info("Downloading %s", url)

    response = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
    response.raise_for_status()
    zip_bytes = len(response.content)

    logger.info("Downloaded %d bytes", zip_bytes)

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        csv_filename = _select_statcan_csv_member(zf.namelist())
        if not csv_filename:
            raise RuntimeError(f"No data CSV found in ZIP from {url}")
        logger.info("Extracting %s", csv_filename)

        with zf.open(csv_filename) as csv_file:
            text = io.TextIOWrapper(csv_file, encoding=encoding)
            reader = csv.DictReader(text)
            rows = list(reader)

    logger.info("Extracted %d rows from %s", len(rows), csv_filename)
    return rows, zip_bytes


def download_labour_pumf_waves(url, encoding="utf-8-sig"):
    """
    Download an LFS PUMF ZIP and read every microdata CSV (pubMMYY.csv).

    - Monthly product ZIPs (e.g. …/2026-03-CSV.zip) contain one wave.
    - Historical annual bundles (e.g. …/hist/2025-CSV.zip) contain twelve monthly files
      under a subfolder (2025-CSV.zip/pub0125.csv, …).

    Returns:
        tuple: (list of (rows, archive_member_path), byte size of the downloaded ZIP,
                Last-Modified header from the HTTP response if present, else None)
    """
    logger.info("Downloading %s", url)

    response = requests.get(url, timeout=LABOUR_PUMF_DOWNLOAD_TIMEOUT)
    response.raise_for_status()
    zip_bytes = len(response.content)
    last_modified = response.headers.get("Last-Modified")

    logger.info("Downloaded %d bytes", zip_bytes)

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        names = zf.namelist()
        pub_members = _list_pumf_pub_csv_members(names)

        if pub_members:
            waves = []
            for member in pub_members:
                with zf.open(member) as csv_file:
                    text = io.TextIOWrapper(csv_file, encoding=encoding)
                    rows = list(csv.DictReader(text))
                logger.info("Extracted %d rows from %s", len(rows), member)
                waves.append((rows, member))
            logger.info("PUMF archive: %d data file(s)", len(waves))
            return waves, zip_bytes, last_modified

        csv_filename = _select_statcan_csv_member(names)
        if not csv_filename:
            raise RuntimeError(f"No PUMF microdata CSV found in ZIP from {url}")
        logger.info("Extracting %s", csv_filename)

        with zf.open(csv_filename) as csv_file:
            text = io.TextIOWrapper(csv_file, encoding=encoding)
            rows = list(csv.DictReader(text))

        logger.info("Extracted %d rows from %s", len(rows), csv_filename)
        return [(rows, csv_filename)], zip_bytes, last_modified
