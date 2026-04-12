"""
DataIngester.py: ETL pipeline orchestrator.
Downloads Statistics Canada open data, transforms it, and loads into MariaDB.
"""

import os
import re
import sys
import time
import logging
from datetime import datetime, timezone

from src.DatabaseHandler import DatabaseHandler
from src.pipeline.extract import download_and_extract_csv, download_labour_pumf_waves
from src.pipeline.pumf_catalog import (
    env_truthy,
    expand_discover_urls,
    finalize_labour_pumf_url_list,
    load_pumf_wave_sync_state,
    pumf_zip_head_last_modified,
    save_pumf_wave_sync_state,
)
from src.pipeline.transform import (
    pivot_housing_data,
    transform_labour_data,
    transform_lfs_ontario_annual,
)
from src.pipeline.load import (
    load_housing_records,
    load_labour_records,
    load_lfs_ontario_records,
    save_pipeline_run,
)
from src.pipeline.metrics import PipelineMetrics

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


DEFAULT_LFS_PUMF_BASE_URL = "https://www150.statcan.gc.ca/n1/pub/71m0001x/2021001"


def _parse_labour_pumf_urls(raw: str | None) -> list[str]:
    """
    STATCAN_LABOUR_URL may be one URL or several (comma or newline separated).
    Each URL must point at a LFS PUMF CSV ZIP (monthly …/YYYY-MM-CSV.zip or hist bundle …/hist/YYYY-CSV.zip).
    """
    if not raw or not raw.strip():
        return []
    urls: list[str] = []
    for chunk in raw.replace("\n", ",").split(","):
        u = chunk.strip()
        if u:
            urls.append(u)
    return urls


def resolve_labour_pumf_download_urls() -> list[str]:
    """
    Build the list of PUMF ZIP URLs to download.

    STATCAN_LABOUR_PUMF_SOURCES (comma/newline tokens) and optional STATCAN_LABOUR_PUMF_BASE_URL:

      - discover     →  scrape STATCAN_LABOUR_PUMF_PRODUCT_PAGE (default 71m0001x2021001-eng.htm)
                       for monthly ZIP links; plus hist/YYYY-CSV.zip for past complete years when
                       STATCAN_LABOUR_PUMF_AUTO_HIST is true (see AUTO_HIST_MIN_YEAR).
      - hist:YYYY    →  {base}/hist/YYYY-CSV.zip
      - YYYY-MM      →  {base}/YYYY-MM-CSV.zip
      - https://…    →  used as-is

    After expansion: dedupe, optional STATCAN_LABOUR_PUMF_MIN_REFERENCE filter, stable sort.

    If SOURCES is empty, fall back to STATCAN_LABOUR_URL (full URLs, legacy).
    """
    spec = os.getenv("STATCAN_LABOUR_PUMF_SOURCES", "").strip()
    if spec:
        base = (os.getenv("STATCAN_LABOUR_PUMF_BASE_URL") or DEFAULT_LFS_PUMF_BASE_URL).rstrip("/")
        urls: list[str] = []
        for chunk in spec.replace("\n", ",").split(","):
            token = chunk.strip()
            if not token:
                continue
            if token.startswith("http://") or token.startswith("https://"):
                urls.append(token)
                continue
            low = token.lower()
            if low == "discover":
                urls.extend(expand_discover_urls(base))
                continue
            if low.startswith("hist:"):
                year = token.split(":", 1)[1].strip()
                if not re.fullmatch(r"\d{4}", year):
                    raise ValueError(
                        f"Invalid hist token {token!r}: use hist:YYYY (e.g. hist:2025)"
                    )
                urls.append(f"{base}/hist/{year}-CSV.zip")
                continue
            if re.fullmatch(r"\d{4}-\d{2}", token):
                urls.append(f"{base}/{token}-CSV.zip")
                continue
            raise ValueError(
                f"Invalid STATCAN_LABOUR_PUMF_SOURCES token {token!r}: "
                "expected discover, hist:YYYY, YYYY-MM, or a full https:// URL"
            )
        return finalize_labour_pumf_url_list(urls)

    return finalize_labour_pumf_url_list(_parse_labour_pumf_urls(os.getenv("STATCAN_LABOUR_URL")))


class DataIngester:
    """
    Orchestrates the ETL pipeline:
      Extract  → download StatCan CSV ZIPs
      Transform → validate, pivot, clean
      Load     → upsert into MariaDB + record pipeline metrics
    """

    def __init__(self, connect=True):
        self.db = DatabaseHandler(connect)
        self.housing_url = os.getenv("STATCAN_HOUSING_URL")
        self.lfs_summary_url = os.getenv("STATCAN_LFS_SUMMARY_URL")
        self.last_update_file = "lastUpdated.txt"

    def get_last_update(self):
        """Read the last successful ingestion date from file."""
        try:
            with open(self.last_update_file, "r", encoding="utf-8") as f:
                date_str = f.read().strip()
                return date_str if date_str else None
        except FileNotFoundError:
            return None

    def save_last_update(self):
        """Save the current UTC date as the last successful ingestion."""
        current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with open(self.last_update_file, "w", encoding="utf-8") as f:
            f.write(current_date)

    def run_housing_pipeline(self):
        """Run the full ETL pipeline for housing data."""
        metrics = PipelineMetrics(source="housing")
        metrics.start()

        try:
            rows, zip_bytes = download_and_extract_csv(self.housing_url)
            metrics.records_extracted = len(rows)
            metrics.bytes_downloaded = zip_bytes

            records = pivot_housing_data(rows)
            metrics.records_transformed = len(records)

            load_housing_records(self.db, records, metrics)

        except Exception as err:
            metrics.add_error("pipeline", str(err))
            logger.error("Housing pipeline failed: %s", err)

        metrics.stop()
        metrics.log_summary()
        save_pipeline_run(self.db, metrics)
        return metrics

    def run_labour_pipeline(self):
        """Download and load LFS PUMF waves (STATCAN_LABOUR_PUMF_SOURCES or STATCAN_LABOUR_URL)."""
        metrics = PipelineMetrics(source="labour")
        try:
            urls = resolve_labour_pumf_download_urls()
        except ValueError as err:
            logger.error("Invalid labour PUMF configuration: %s", err)
            metrics.add_error("pipeline", str(err))
            return metrics
        if not urls:
            logger.info(
                "No labour PUMF URLs (set STATCAN_LABOUR_PUMF_SOURCES or STATCAN_LABOUR_URL); skipping"
            )
            return metrics

        metrics.start()

        skip_unchanged = env_truthy("STATCAN_LABOUR_PUMF_SKIP_UNCHANGED", True)
        sync_state = load_pumf_wave_sync_state()

        for url in urls:
            try:
                if skip_unchanged:
                    head_lm = pumf_zip_head_last_modified(url)
                    if head_lm and sync_state.get(url) == head_lm:
                        logger.info(
                            "Skipping %s (Last-Modified unchanged since last ingest: %s)",
                            url,
                            head_lm,
                        )
                        continue
                waves, zip_bytes, resp_lm = download_labour_pumf_waves(url)
                metrics.bytes_downloaded += zip_bytes
                for rows, _member in waves:
                    metrics.records_extracted += len(rows)
                    records = transform_labour_data(rows)
                    metrics.records_transformed += len(records)
                    load_labour_records(self.db, records, metrics)
                if resp_lm:
                    sync_state[url] = resp_lm
                    save_pumf_wave_sync_state(sync_state)
            except Exception as err:
                metrics.add_error("pipeline", f"{url}: {err}")
                logger.error("Labour PUMF wave failed (%s): %s", url, err)

        metrics.stop()
        metrics.log_summary()
        save_pipeline_run(self.db, metrics)
        return metrics

    def run_lfs_ontario_pipeline(self):
        """Download StatCan annual LFS summary CSV and load Ontario rate time series."""
        metrics = PipelineMetrics(source="lfs_ontario")
        if not self.lfs_summary_url:
            logger.info("STATCAN_LFS_SUMMARY_URL not set; skipping Ontario LFS annual summary")
            return metrics

        metrics.start()
        try:
            rows, zip_bytes = download_and_extract_csv(self.lfs_summary_url)
            metrics.records_extracted = len(rows)
            metrics.bytes_downloaded = zip_bytes

            records = transform_lfs_ontario_annual(rows)
            metrics.records_transformed = len(records)

            load_lfs_ontario_records(self.db, records, metrics)

        except Exception as err:
            metrics.add_error("pipeline", str(err))
            logger.error("LFS Ontario annual pipeline failed: %s", err)

        metrics.stop()
        metrics.log_summary()
        save_pipeline_run(self.db, metrics)
        return metrics

    def process_and_store(self):
        """Run all pipelines and save the last update timestamp."""
        housing_metrics = self.run_housing_pipeline()
        labour_metrics = self.run_labour_pipeline()
        lfs_metrics = self.run_lfs_ontario_pipeline()

        total_loaded = (
            housing_metrics.records_loaded
            + labour_metrics.records_loaded
            + lfs_metrics.records_loaded
        )
        if total_loaded > 0:
            self.save_last_update()

        logger.info(
            "All pipelines complete: housing=%d, labour=%d, lfs_ontario=%d loaded",
            housing_metrics.records_loaded,
            labour_metrics.records_loaded,
            lfs_metrics.records_loaded,
        )


if __name__ == "__main__":
    max_retries = 5
    for attempt in range(max_retries):
        try:
            ingester = DataIngester(True)
            ingester.process_and_store()
            break
        except Exception as e:
            logger.error("Attempt %d failed: %s", attempt + 1, e)
            if attempt < max_retries - 1:
                time.sleep(5)
                continue
            raise
