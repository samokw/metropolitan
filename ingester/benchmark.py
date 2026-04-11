"""
Benchmark: compare per-row vs bulk load strategies for both housing and labour data.

Run via:  docker compose run --rm ingester python -m benchmark
"""

import os
import sys
import time
import logging
import mariadb

from src.DataIngester import resolve_labour_pumf_download_urls
from src.DatabaseHandler import DatabaseHandler
from src.pipeline.extract import download_and_extract_csv, download_labour_pumf_waves
from src.pipeline.transform import (
    pivot_housing_data,
    transform_labour_data,
    AVG_HOUSING_ROW_BYTES,
    AVG_LABOUR_ROW_BYTES,
)
from src.pipeline.load import _safe, save_pipeline_run
from src.pipeline.metrics import PipelineMetrics

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("benchmark")


def _per_row_load_housing(db_handler, records):
    """Original strategy: SELECT to check for duplicates, INSERT if not found, COMMIT per row."""
    cursor = db_handler.conn.cursor()
    loaded = 0
    try:
        cursor.execute("TRUNCATE TABLE housing_data")
        db_handler.conn.commit()

        for idx, r in enumerate(records):
            jsonid = idx + 1
            cma = r["census_metropolitan_area"]
            month = _safe(r["month"])
            total_starts = _safe(r["total_starts"])
            total_complete = _safe(r["total_complete"])
            singles_starts = _safe(r["singles_starts"])
            semis_starts = _safe(r["semis_starts"])
            row_starts = _safe(r["row_starts"])
            apartment_starts = _safe(r["apartment_starts"])
            singles_complete = _safe(r["singles_complete"])
            semis_complete = _safe(r["semis_complete"])
            row_complete = _safe(r["row_complete"])
            apartment_complete = _safe(r["apartment_complete"])

            cursor.execute(
                """SELECT id FROM housing_data
                WHERE jsonid = ?
                AND census_metropolitan_area = ?
                AND month = ?
                AND total_starts = ?
                AND total_complete = ?
                AND singles_starts = ?
                AND semis_starts = ?
                AND row_starts = ?
                AND apartment_starts = ?
                AND singles_complete = ?
                AND semis_complete = ?
                AND row_complete = ?
                AND apartment_complete = ?""",
                (
                    jsonid, cma, month,
                    total_starts, total_complete,
                    singles_starts, semis_starts, row_starts, apartment_starts,
                    singles_complete, semis_complete, row_complete, apartment_complete,
                ),
            )
            result = cursor.fetchone()

            if result is None:
                cursor.execute(
                    """INSERT INTO housing_data
                    (jsonid, census_metropolitan_area, month,
                     total_starts, total_complete,
                     singles_starts, semis_starts, row_starts, apartment_starts,
                     singles_complete, semis_complete, row_complete, apartment_complete)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        jsonid, cma, month,
                        total_starts, total_complete,
                        singles_starts, semis_starts, row_starts, apartment_starts,
                        singles_complete, semis_complete, row_complete, apartment_complete,
                    ),
                )
                db_handler.conn.commit()
                loaded += 1
        return loaded
    except mariadb.Error as e:
        db_handler.conn.rollback()
        raise e
    finally:
        cursor.close()


def _per_row_load_labour(db_handler, records):
    """Original strategy: SELECT to check for duplicates, INSERT if not found, COMMIT per row."""
    cursor = db_handler.conn.cursor()
    loaded = 0
    try:
        sy = records[0]["survey_year"]
        sm = records[0]["survey_month"]
        cursor.execute(
            "DELETE FROM labour_market_data WHERE survey_year = ? AND survey_month = ?",
            (sy, sm),
        )
        db_handler.conn.commit()

        for idx, r in enumerate(records):
            jsonid = idx + 1
            province = r["province"]
            education_level = r["education_level"]
            labour_force_status = r["labour_force_status"]

            cursor.execute(
                """SELECT id FROM labour_market_data
                WHERE jsonid = ?
                AND province = ?
                AND education_level = ?
                AND labour_force_status = ?
                AND survey_year = ?
                AND survey_month = ?""",
                (jsonid, province, education_level, labour_force_status, sy, sm),
            )
            result = cursor.fetchone()

            if result is None:
                cursor.execute(
                    """INSERT INTO labour_market_data
                    (jsonid, province, education_level, labour_force_status, survey_year, survey_month)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (jsonid, province, education_level, labour_force_status, sy, sm),
                )
                db_handler.conn.commit()
                loaded += 1
        return loaded
    except mariadb.Error as e:
        db_handler.conn.rollback()
        raise e
    finally:
        cursor.close()


def _bulk_load_housing(db_handler, records):
    """New strategy: TRUNCATE + executemany in batches."""
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
    return db_handler.bulk_load_housing_records(rows)


def _bulk_load_labour(db_handler, records):
    """New strategy: DELETE one wave + executemany in batches."""
    sy = records[0]["survey_year"]
    sm = records[0]["survey_month"]
    rows = [
        (
            idx + 1,
            r["province"],
            r["education_level"],
            r["labour_force_status"],
            sy,
            sm,
        )
        for idx, r in enumerate(records)
    ]
    return db_handler.bulk_load_labour_records(sy, sm, rows)


def run_benchmark(db_handler, source, records, per_row_fn, bulk_fn, avg_row_bytes):
    """Run both strategies for a given dataset and record results."""
    results = []

    for strategy, load_fn in [("per_row", per_row_fn), ("bulk", bulk_fn)]:
        logger.info("Running %s / %s (%d records)…", source, strategy, len(records))

        metrics = PipelineMetrics(source=source, strategy=strategy)
        metrics.records_extracted = len(records)
        metrics.records_transformed = len(records)
        metrics.start()

        try:
            loaded = load_fn(db_handler, records)
            metrics.records_loaded = loaded
            metrics.estimated_bytes_loaded = loaded * avg_row_bytes
        except Exception as err:
            metrics.records_rejected = len(records)
            metrics.add_error("load", str(err))
            logger.error("%s/%s failed: %s", source, strategy, err)

        metrics.stop()
        save_pipeline_run(db_handler, metrics)
        results.append((strategy, metrics))
        logger.info(
            "%s/%s done: %d records in %.2fs",
            source, strategy, metrics.records_loaded, metrics.duration_seconds,
        )

    return results


def print_summary(all_results):
    """Print a comparison table to stdout."""
    print("\n" + "=" * 70)
    print("  BENCHMARK RESULTS")
    print("=" * 70)
    print(f"  {'Source':<10} {'Strategy':<10} {'Records':>10} {'Duration (s)':>14} {'Rows/sec':>10}")
    print("-" * 70)

    grouped = {}
    for source, pairs in all_results.items():
        grouped[source] = {}
        for strategy, m in pairs:
            rps = m.records_loaded / m.duration_seconds if m.duration_seconds > 0 else 0
            grouped[source][strategy] = m
            print(f"  {source:<10} {strategy:<10} {m.records_loaded:>10,} {m.duration_seconds:>14.2f} {rps:>10,.0f}")

    print("-" * 70)
    for source, strategies in grouped.items():
        if "per_row" in strategies and "bulk" in strategies:
            old_d = strategies["per_row"].duration_seconds
            new_d = strategies["bulk"].duration_seconds
            if new_d > 0:
                speedup = old_d / new_d
                print(f"  {source:<10} speedup: {speedup:>8.1f}x faster with bulk strategy")
    print("=" * 70 + "\n")


def main():
    housing_url = os.getenv("STATCAN_HOUSING_URL")
    labour_urls = resolve_labour_pumf_download_urls()
    labour_url = labour_urls[0] if labour_urls else None

    if not housing_url or not labour_url:
        sys.exit(
            "ERROR: STATCAN_HOUSING_URL must be set, and labour PUMF must be configured "
            "(STATCAN_LABOUR_PUMF_SOURCES or STATCAN_LABOUR_URL; benchmark uses the first resolved URL)"
        )

    db = DatabaseHandler(connect=True)

    logger.info("Downloading housing data…")
    housing_rows, _ = download_and_extract_csv(housing_url)
    housing_records = pivot_housing_data(housing_rows)

    logger.info("Downloading labour data…")
    labour_waves, _, _ = download_labour_pumf_waves(labour_url)
    labour_rows = labour_waves[0][0]
    labour_records = transform_labour_data(labour_rows)

    all_results = {}

    all_results["housing"] = run_benchmark(
        db, "housing", housing_records,
        _per_row_load_housing, _bulk_load_housing,
        AVG_HOUSING_ROW_BYTES,
    )

    all_results["labour"] = run_benchmark(
        db, "labour", labour_records,
        _per_row_load_labour, _bulk_load_labour,
        AVG_LABOUR_ROW_BYTES,
    )

    print_summary(all_results)
    db.close()


if __name__ == "__main__":
    main()
