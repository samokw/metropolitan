"""
Load stage: insert transformed records into MariaDB via DatabaseHandler.
Tracks load metrics and records pipeline runs.
"""

import logging
from datetime import datetime, timezone

from src.pipeline.transform import (
    AVG_HOUSING_ROW_BYTES,
    AVG_LABOUR_ROW_BYTES,
    AVG_LFS_SUMMARY_ROW_BYTES,
)

logger = logging.getLogger(__name__)


def _safe(val):
    """Convert empty/None values to 0 for numeric fields."""
    if val == "" or val is None:
        return 0
    return int(str(val).replace(",", ""))


def load_housing_records(db_handler, records, metrics):
    """
    Load housing records into the database using bulk TRUNCATE + INSERT.
    The StatCan housing CSV is a complete historical dataset, so a full
    reload is idempotent and much faster than per-row dedup.

    Args:
        db_handler: DatabaseHandler instance.
        records: list of dicts from transform stage.
        metrics: PipelineMetrics to update.
    """
    rows = [
        (
            idx + 1,
            r["census_metropolitan_area"],
            _safe(r["month"]),
            _safe(r.get("year", 0)),
            _safe(r["total_starts"]),
            _safe(r["total_complete"]),
            _safe(r["singles_starts"]),
            _safe(r["semis_starts"]),
            _safe(r["row_starts"]),
            _safe(r["apartment_starts"]),
            _safe(r["singles_complete"]),
            _safe(r["semis_complete"]),
            _safe(r["row_complete"]),
            _safe(r["apartment_complete"]),
        )
        for idx, r in enumerate(records)
    ]

    try:
        loaded = db_handler.bulk_load_housing_records(rows)
        metrics.records_loaded += loaded
        metrics.estimated_bytes_loaded += loaded * AVG_HOUSING_ROW_BYTES
        logger.info("Bulk-loaded %d housing records", loaded)
    except Exception as err:
        metrics.records_rejected += len(rows)
        metrics.add_error("load", f"Housing bulk load failed: {err}")
        logger.error("Failed to bulk-load housing records: %s", err)


def load_labour_records(db_handler, records, metrics):
    """
    Load one LFS PUMF survey wave: DELETE that (survey_year, survey_month) then bulk INSERT.
    Other months already in the DB are kept so multiple ingests build a multi-month history.

    Args:
        db_handler: DatabaseHandler instance.
        records: list of dicts from transform stage.
        metrics: PipelineMetrics to update.
    """
    if not records:
        logger.warning("No labour records to load")
        return

    survey_year = int(records[0]["survey_year"])
    survey_month = int(records[0]["survey_month"])
    rows = [
        (
            idx + 1,
            r["province"],
            r["education_level"],
            r["labour_force_status"],
            survey_year,
            survey_month,
        )
        for idx, r in enumerate(records)
    ]

    try:
        loaded = db_handler.bulk_load_labour_records(survey_year, survey_month, rows)
        metrics.records_loaded += loaded
        metrics.estimated_bytes_loaded += loaded * AVG_LABOUR_ROW_BYTES
        logger.info("Bulk-loaded %d labour records", loaded)
    except Exception as err:
        metrics.records_rejected += len(rows)
        metrics.add_error("load", f"Labour bulk load failed: {err}")
        logger.error("Failed to bulk-load labour records: %s", err)


def load_lfs_ontario_records(db_handler, records, metrics):
    """
    Load annual Ontario LFS summary rates (TRUNCATE + bulk INSERT).

    Args:
        db_handler: DatabaseHandler instance.
        records: list of dicts from transform_lfs_ontario_annual.
        metrics: PipelineMetrics to update.
    """
    rows = [
        (
            r["year"],
            float(r["employment_rate"]),
            float(r["unemployment_rate"]),
            float(r["participation_rate"]),
        )
        for r in records
    ]
    try:
        loaded = db_handler.bulk_load_lfs_ontario_annual(rows)
        metrics.records_loaded += loaded
        metrics.estimated_bytes_loaded += loaded * AVG_LFS_SUMMARY_ROW_BYTES
        logger.info("Bulk-loaded %d Ontario annual LFS rows", loaded)
    except Exception as err:
        metrics.records_rejected += len(rows)
        metrics.add_error("load", f"LFS Ontario annual load failed: {err}")
        logger.error("Failed to bulk-load LFS Ontario annual: %s", err)


def save_pipeline_run(db_handler, metrics):
    """
    Write a pipeline run summary to the pipeline_runs table.
    This enables Grafana to query ingestion history over time.
    """
    cursor = db_handler.conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO pipeline_runs
            (source, records_extracted, records_transformed, records_loaded,
             records_rejected, bytes_downloaded, estimated_bytes_loaded,
             success_rate_pct, duration_seconds, error_count, strategy, run_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                metrics.source,
                metrics.records_extracted,
                metrics.records_transformed,
                metrics.records_loaded,
                metrics.records_rejected,
                metrics.bytes_downloaded,
                metrics.estimated_bytes_loaded,
                metrics.success_rate,
                metrics.duration_seconds,
                len(metrics.errors),
                metrics.strategy,
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        db_handler.conn.commit()
        logger.info("Saved pipeline run metrics to database")
    except Exception as err:
        logger.error("Failed to save pipeline run metrics: %s", err)
    finally:
        cursor.close()
