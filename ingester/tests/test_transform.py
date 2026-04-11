"""
Tests for the transform stage of the ETL pipeline.
"""

import pytest
from src.pipeline.transform import (
    pivot_housing_data,
    transform_labour_data,
    validate_columns,
    _parse_geo,
    _parse_month,
    _safe_int,
)


class TestHelpers:
    def test_parse_geo_strips_province(self):
        assert _parse_geo("Toronto, Ontario") == "Toronto"

    def test_parse_geo_no_province(self):
        assert _parse_geo("Canada") == "Canada"

    def test_parse_month(self):
        assert _parse_month("2024-01") == 1
        assert _parse_month("2024-12") == 12

    def test_parse_month_invalid(self):
        assert _parse_month("2024") == 0

    def test_safe_int_normal(self):
        assert _safe_int("1500") == 1500

    def test_safe_int_with_commas(self):
        assert _safe_int("1,500") == 1500

    def test_safe_int_empty(self):
        assert _safe_int("") == 0
        assert _safe_int(None) == 0


class TestValidateColumns:
    def test_valid_columns(self):
        rows = [{"REF_DATE": "x", "GEO": "x", "Housing estimates": "x", "Type of unit": "x", "VALUE": "x"}]
        validate_columns(rows, {"REF_DATE", "GEO"}, "test")

    def test_missing_columns(self):
        rows = [{"REF_DATE": "x"}]
        with pytest.raises(ValueError, match="missing columns"):
            validate_columns(rows, {"REF_DATE", "GEO"}, "test")

    def test_empty_rows(self):
        with pytest.raises(ValueError, match="No rows"):
            validate_columns([], {"REF_DATE"}, "test")


class TestPivotHousingData:
    def test_pivot_single_cma(self):
        rows = [
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing starts", "Type of unit": "Total units", "VALUE": "1500"},
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing starts", "Type of unit": "Single-detached units", "VALUE": "200"},
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing completions", "Type of unit": "Total units", "VALUE": "1200"},
        ]
        records = pivot_housing_data(rows)

        assert len(records) == 1
        record = records[0]
        assert record["census_metropolitan_area"] == "Toronto"
        assert record["month"] == 1
        assert record["total_starts"] == 1500
        assert record["singles_starts"] == 200
        assert record["total_complete"] == 1200

    def test_pivot_multiple_cmas(self):
        rows = [
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing starts", "Type of unit": "Total units", "VALUE": "1500"},
            {"REF_DATE": "2024-01", "GEO": "Hamilton, Ontario", "Housing estimates": "Housing starts", "Type of unit": "Total units", "VALUE": "300"},
        ]
        records = pivot_housing_data(rows)
        assert len(records) == 2

    def test_pivot_skips_under_construction(self):
        rows = [
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing under construction", "Type of unit": "Total units", "VALUE": "5000"},
        ]
        records = pivot_housing_data(rows)
        assert len(records) == 0

    def test_pivot_handles_empty_values(self):
        rows = [
            {"REF_DATE": "2024-01", "GEO": "Toronto, Ontario", "Housing estimates": "Housing starts", "Type of unit": "Total units", "VALUE": ""},
        ]
        records = pivot_housing_data(rows)
        assert len(records) == 1
        assert records[0]["total_starts"] == 0

    def test_pivot_missing_columns_raises(self):
        rows = [{"REF_DATE": "2024-01", "GEO": "Toronto"}]
        with pytest.raises(ValueError):
            pivot_housing_data(rows)


class TestTransformLabourData:
    def test_transform_basic(self):
        rows = [
            {"PROV": "35", "EDUC": "4", "LFSSTAT": "1"},
            {"PROV": "48", "EDUC": "2", "LFSSTAT": "3"},
        ]
        records = transform_labour_data(rows)

        assert len(records) == 2
        assert records[0]["province"] == 35
        assert records[0]["education_level"] == 4
        assert records[0]["labour_force_status"] == 1

    def test_transform_skips_bad_rows(self):
        rows = [
            {"PROV": "35", "EDUC": "4", "LFSSTAT": "1"},
            {"PROV": "bad", "EDUC": "4", "LFSSTAT": "1"},
        ]
        records = transform_labour_data(rows)
        assert len(records) == 1

    def test_transform_missing_columns_raises(self):
        rows = [{"PROV": "35"}]
        with pytest.raises(ValueError):
            transform_labour_data(rows)

    def test_transform_empty_raises(self):
        with pytest.raises(ValueError):
            transform_labour_data([])
