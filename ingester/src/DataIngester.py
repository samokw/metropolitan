"""
DataIngester.py: ETL pipeline orchestrator.
Downloads Statistics Canada open data, transforms it, and loads into MariaDB.
"""

import os
import sys
import time
import logging
from datetime import datetime, timezone

from src.DatabaseHandler import DatabaseHandler
from src.pipeline.extract import download_and_extract_csv
from src.pipeline.transform import pivot_housing_data, transform_labour_data
from src.pipeline.load import (
    load_housing_records,
    load_labour_records,
    save_pipeline_run,
)
from src.pipeline.metrics import PipelineMetrics

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


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
        self.labour_url = os.getenv("STATCAN_LABOUR_URL")
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
        """Run the full ETL pipeline for labour market data."""
        metrics = PipelineMetrics(source="labour")
        metrics.start()

        try:
            rows, zip_bytes = download_and_extract_csv(self.labour_url)
            metrics.records_extracted = len(rows)
            metrics.bytes_downloaded = zip_bytes

            records = transform_labour_data(rows)
            metrics.records_transformed = len(records)

            load_labour_records(self.db, records, metrics)

        except Exception as err:
            metrics.add_error("pipeline", str(err))
            logger.error("Labour pipeline failed: %s", err)

        metrics.stop()
        metrics.log_summary()
        save_pipeline_run(self.db, metrics)
        return metrics

    def process_and_store(self):
        """Run all pipelines and save the last update timestamp."""
        housing_metrics = self.run_housing_pipeline()
        labour_metrics = self.run_labour_pipeline()

        total_loaded = housing_metrics.records_loaded + labour_metrics.records_loaded
        if total_loaded > 0:
            self.save_last_update()

        logger.info(
            "All pipelines complete: housing=%d loaded, labour=%d loaded",
            housing_metrics.records_loaded,
            labour_metrics.records_loaded,
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
