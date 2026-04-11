"""
Transform stage: validate, clean, and pivot StatCan CSV data into
the wide format expected by the housing_data and labour_market_data tables.
"""

import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

HOUSING_REQUIRED_COLUMNS = {"REF_DATE", "GEO", "Housing estimates", "Type of unit", "VALUE"}

HOUSING_COLUMN_MAP = {
    ("Housing starts", "Single-detached units"): "singles_starts",
    ("Housing starts", "Semi-detached units"): "semis_starts",
    ("Housing starts", "Row units"): "row_starts",
    ("Housing starts", "Apartment and other unit types"): "apartment_starts",
    ("Housing starts", "Total units"): "total_starts",
    ("Housing completions", "Single-detached units"): "singles_complete",
    ("Housing completions", "Semi-detached units"): "semis_complete",
    ("Housing completions", "Row units"): "row_complete",
    ("Housing completions", "Apartment and other unit types"): "apartment_complete",
    ("Housing completions", "Total units"): "total_complete",
}

LABOUR_REQUIRED_COLUMNS = {"PROV", "EDUC", "LFSSTAT"}

AVG_HOUSING_ROW_BYTES = 120
AVG_LABOUR_ROW_BYTES = 40


def validate_columns(rows, required_columns, source_name):
    """
    Validate that the CSV contains all required columns.

    Raises:
        ValueError: if any required columns are missing.
    """
    if not rows:
        raise ValueError(f"No rows in {source_name} data")

    actual = set(rows[0].keys())
    missing = required_columns - actual
    if missing:
        raise ValueError(
            f"{source_name} CSV missing columns: {missing}. "
            f"Found: {sorted(actual)}"
        )
    logger.info("%s schema validation passed (%d columns)", source_name, len(actual))


def _parse_geo(geo_value):
    """Strip province suffix from GEO values like 'Toronto, Ontario'."""
    return geo_value.split(",")[0].strip()


def _parse_month(ref_date):
    """Extract month as int from REF_DATE like '2024-01'."""
    parts = ref_date.split("-")
    if len(parts) >= 2:
        return int(parts[1])
    return 0


def _safe_int(value):
    """Convert a string value to int, handling empty/null/commas."""
    if not value or value.strip() == "":
        return 0
    return int(str(value).replace(",", "").strip())


def pivot_housing_data(rows):
    """
    Pivot StatCan long-format housing CSV rows into wide-format dicts
    matching the housing_data table schema.

    Input rows have: REF_DATE, GEO, Housing estimates, Type of unit, VALUE
    Output dicts have: census_metropolitan_area, month, singles_starts, etc.

    Returns:
        list of dicts ready for HousingData construction.
    """
    validate_columns(rows, HOUSING_REQUIRED_COLUMNS, "Housing")

    grouped = defaultdict(dict)
    skipped = 0

    for row in rows:
        estimate = row["Housing estimates"]
        unit_type = row["Type of unit"]
        key = (estimate, unit_type)

        if key not in HOUSING_COLUMN_MAP:
            continue

        ref_date = row["REF_DATE"]
        geo = row["GEO"]
        group_key = (ref_date, geo)

        column_name = HOUSING_COLUMN_MAP[key]
        try:
            grouped[group_key][column_name] = _safe_int(row["VALUE"])
        except (ValueError, TypeError) as err:
            skipped += 1
            logger.debug("Skipping bad value in row %s: %s", group_key, err)

    records = []
    for (ref_date, geo), columns in grouped.items():
        record = {
            "census_metropolitan_area": _parse_geo(geo),
            "month": _parse_month(ref_date),
            "singles_starts": columns.get("singles_starts", 0),
            "semis_starts": columns.get("semis_starts", 0),
            "row_starts": columns.get("row_starts", 0),
            "apartment_starts": columns.get("apartment_starts", 0),
            "total_starts": columns.get("total_starts", 0),
            "singles_complete": columns.get("singles_complete", 0),
            "semis_complete": columns.get("semis_complete", 0),
            "row_complete": columns.get("row_complete", 0),
            "apartment_complete": columns.get("apartment_complete", 0),
            "total_complete": columns.get("total_complete", 0),
        }
        records.append(record)

    if skipped:
        logger.warning("Skipped %d rows with bad values during pivot", skipped)

    logger.info(
        "Pivoted %d CSV rows into %d housing records (%d values skipped)",
        len(rows), len(records), skipped
    )
    return records


def transform_labour_data(rows):
    """
    Transform LFS PUMF CSV rows into dicts matching the labour_market_data
    table schema. The CSV is already flat, so no pivot is needed.

    Returns:
        list of dicts ready for LabourMarketData construction.
    """
    validate_columns(rows, LABOUR_REQUIRED_COLUMNS, "Labour")

    records = []
    skipped = 0

    for row in rows:
        try:
            record = {
                "province": _safe_int(row["PROV"]),
                "education_level": _safe_int(row["EDUC"]),
                "labour_force_status": _safe_int(row["LFSSTAT"]),
            }
            records.append(record)
        except (ValueError, TypeError) as err:
            skipped += 1
            logger.debug("Skipping bad labour row: %s", err)

    if skipped:
        logger.warning("Skipped %d bad rows during labour transform", skipped)

    logger.info(
        "Transformed %d labour rows (%d skipped)", len(records), skipped
    )
    return records
