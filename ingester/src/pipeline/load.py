"""
Load stage: insert transformed records into MariaDB via DatabaseHandler.
Tracks load metrics and records pipeline runs.
"""

import logging
from datetime import datetime, timezone

from src.pipeline.transform import AVG_HOUSING_ROW_BYTES, AVG_LABOUR_ROW_BYTES

logger = logging.getLogger(__name__)


def load_housing_records(db_handler, records, metrics):
    """
    Load housing records into the database.

    Args:
        db_handler: DatabaseHandler instance.
        records: list of dicts from transform stage.
        metrics: PipelineMetrics to update.
    """
    from src.housingdata.HousingData import HousingData

    loaded = 0
    rejected = 0
    jsonid_counter = 0

    for record in records:
        jsonid_counter += 1
        try:
            housing_data = HousingData(
                jsonid=jsonid_counter,
                census_metropolitan_area=record["census_metropolitan_area"],
                month=record["month"],
                total_starts=record["total_starts"],
                total_complete=record["total_complete"],
                singles_starts=record["singles_starts"],
                semis_starts=record["semis_starts"],
                row_starts=record["row_starts"],
                apartment_starts=record["apartment_starts"],
                singles_complete=record["singles_complete"],
                semis_complete=record["semis_complete"],
                row_complete=record["row_complete"],
                apartment_complete=record["apartment_complete"],
            )
            db_handler.insert_housing_data(housing_data)
            loaded += 1
        except Exception as err:
            rejected += 1
            metrics.add_error("load", f"Housing record {jsonid_counter}: {err}")
            logger.error("Failed to load housing record %d: %s", jsonid_counter, err)

    metrics.records_loaded += loaded
    metrics.records_rejected += rejected
    metrics.estimated_bytes_loaded += loaded * AVG_HOUSING_ROW_BYTES
    logger.info("Loaded %d housing records, rejected %d", loaded, rejected)


def load_labour_records(db_handler, records, metrics):
    """
    Load labour market records into the database.

    Args:
        db_handler: DatabaseHandler instance.
        records: list of dicts from transform stage.
        metrics: PipelineMetrics to update.
    """
    from src.labourMarketData.LabourMarketData import LabourMarketData

    loaded = 0
    rejected = 0
    jsonid_counter = 0

    for record in records:
        jsonid_counter += 1
        try:
            labour_data = LabourMarketData(
                jsonid=jsonid_counter,
                province=record["province"],
                education_level=record["education_level"],
                labour_force_status=record["labour_force_status"],
            )
            db_handler.insert_labour_market_data(labour_data)
            loaded += 1
        except Exception as err:
            rejected += 1
            metrics.add_error("load", f"Labour record {jsonid_counter}: {err}")
            logger.error("Failed to load labour record %d: %s", jsonid_counter, err)

    metrics.records_loaded += loaded
    metrics.records_rejected += rejected
    metrics.estimated_bytes_loaded += loaded * AVG_LABOUR_ROW_BYTES
    logger.info("Loaded %d labour records, rejected %d", loaded, rejected)


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
             success_rate_pct, duration_seconds, error_count, run_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        db_handler.conn.commit()
        logger.info("Saved pipeline run metrics to database")
    except Exception as err:
        logger.error("Failed to save pipeline run metrics: %s", err)
    finally:
        cursor.close()
