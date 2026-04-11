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
        csv_files = [f for f in zf.namelist() if f.endswith(".csv") and "MetaData" not in f]
        if not csv_files:
            raise RuntimeError(f"No data CSV found in ZIP from {url}")

        csv_filename = csv_files[0]
        logger.info("Extracting %s", csv_filename)

        with zf.open(csv_filename) as csv_file:
            text = io.TextIOWrapper(csv_file, encoding=encoding)
            reader = csv.DictReader(text)
            rows = list(reader)

    logger.info("Extracted %d rows from %s", len(rows), csv_filename)
    return rows, zip_bytes
