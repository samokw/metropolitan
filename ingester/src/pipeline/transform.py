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

LABOUR_REQUIRED_COLUMNS = {"PROV", "EDUC", "LFSSTAT", "SURVYEAR", "SURVMNTH"}

AVG_HOUSING_ROW_BYTES = 120
AVG_LABOUR_ROW_BYTES = 40
AVG_LFS_SUMMARY_ROW_BYTES = 48

LFS_ONTARIO_REQUIRED_COLUMNS = {
    "REF_DATE",
    "GEO",
    "Labour force characteristics",
    "VALUE",
}

LFS_RATE_CHARACTERISTICS = {
    "Employment rate": "employment_rate",
    "Unemployment rate": "unemployment_rate",
    "Participation rate": "participation_rate",
}


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


def _parse_year(ref_date):
    """Extract year as int from REF_DATE like '2024-01'."""
    parts = ref_date.split("-")
    if parts and parts[0]:
        return int(parts[0])
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
            "year": _parse_year(ref_date),
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
    Preserves SURVYEAR / SURVMNTH so multiple monthly waves can be stored.

    Returns:
        list of dicts ready for LabourMarketData construction.
    """
    validate_columns(rows, LABOUR_REQUIRED_COLUMNS, "Labour")

    ref_sy = _safe_int(rows[0]["SURVYEAR"])
    ref_sm = _safe_int(rows[0]["SURVMNTH"])

    records = []
    skipped = 0
    mixed_wave = 0

    for row in rows:
        try:
            sy = _safe_int(row["SURVYEAR"])
            sm = _safe_int(row["SURVMNTH"])
            if sy != ref_sy or sm != ref_sm:
                mixed_wave += 1
            record = {
                "province": _safe_int(row["PROV"]),
                "education_level": _safe_int(row["EDUC"]),
                "labour_force_status": _safe_int(row["LFSSTAT"]),
                "survey_year": sy,
                "survey_month": sm,
            }
            records.append(record)
        except (ValueError, TypeError) as err:
            skipped += 1
            logger.debug("Skipping bad labour row: %s", err)

    if mixed_wave:
        logger.warning(
            "Labour PUMF file has %d rows with survey period differing from first row (%d-%02d)",
            mixed_wave, ref_sy, ref_sm,
        )

    if skipped:
        logger.warning("Skipped %d bad rows during labour transform", skipped)

    logger.info(
        "Transformed %d labour rows for survey %d-%02d (%d skipped)",
        len(records), ref_sy, ref_sm, skipped,
    )
    return records


def _parse_lfs_year(ref_date):
    """Year from REF_DATE like '2006' or '2006-01'."""
    if not ref_date or not str(ref_date).strip():
        return None
    return int(str(ref_date).strip().split("-")[0])


def transform_lfs_ontario_annual(rows):
    """
    Pivot StatCan summary CSV (product 14100393, Ontario) into one record per year
    with employment, unemployment, and participation rates (%).
    """
    validate_columns(rows, LFS_ONTARIO_REQUIRED_COLUMNS, "LFS Ontario annual")

    by_year = {}
    for row in rows:
        if row.get("GEO", "").strip() != "Ontario":
            continue
        char = row.get("Labour force characteristics", "").strip()
        if char not in LFS_RATE_CHARACTERISTICS:
            continue
        y = _parse_lfs_year(row.get("REF_DATE"))
        if y is None:
            continue
        raw_val = row.get("VALUE")
        if raw_val is None or str(raw_val).strip() == "":
            continue
        try:
            val = float(str(raw_val).replace(",", "").strip())
        except (ValueError, TypeError):
            continue
        key = LFS_RATE_CHARACTERISTICS[char]
        by_year.setdefault(y, {})[key] = val

    records = []
    for year in sorted(by_year):
        cols = by_year[year]
        if not all(k in cols for k in ("employment_rate", "unemployment_rate", "participation_rate")):
            logger.debug("Skipping year %s with incomplete LFS rates: %s", year, cols)
            continue
        records.append(
            {
                "year": year,
                "employment_rate": cols["employment_rate"],
                "unemployment_rate": cols["unemployment_rate"],
                "participation_rate": cols["participation_rate"],
            }
        )

    logger.info("Built %d Ontario annual LFS rate rows", len(records))
    return records
