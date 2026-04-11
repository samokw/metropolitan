"""
Tests for the transform stage of the ETL pipeline.
"""

import pytest
from src.pipeline.transform import (
    pivot_housing_data,
    transform_labour_data,
    transform_lfs_ontario_annual,
    validate_columns,
    _parse_geo,
    _parse_month,
    _parse_year,
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

    def test_parse_year(self):
        assert _parse_year("2024-01") == 2024
        assert _parse_year("1990-12") == 1990

    def test_parse_year_invalid(self):
        assert _parse_year("") == 0

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
        assert record["year"] == 2024
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


def _labour_row(prov, educ, lfs, sy=2024, sm=3):
    return {
        "PROV": str(prov),
        "EDUC": str(educ),
        "LFSSTAT": str(lfs),
        "SURVYEAR": str(sy),
        "SURVMNTH": str(sm),
    }


class TestTransformLabourData:
    def test_transform_basic(self):
        rows = [
            _labour_row(35, 4, 1),
            _labour_row(48, 2, 3),
        ]
        records = transform_labour_data(rows)

        assert len(records) == 2
        assert records[0]["province"] == 35
        assert records[0]["education_level"] == 4
        assert records[0]["labour_force_status"] == 1
        assert records[0]["survey_year"] == 2024
        assert records[0]["survey_month"] == 3

    def test_transform_skips_bad_rows(self):
        rows = [
            _labour_row(35, 4, 1),
            {"PROV": "bad", "EDUC": "4", "LFSSTAT": "1", "SURVYEAR": "2024", "SURVMNTH": "3"},
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


class TestTransformLfsOntarioAnnual:
    def test_pivot_ontario_rates(self):
        rows = [
            {
                "REF_DATE": "2019",
                "GEO": "Ontario",
                "Labour force characteristics": "Employment rate",
                "VALUE": "62.1",
            },
            {
                "REF_DATE": "2019",
                "GEO": "Ontario",
                "Labour force characteristics": "Unemployment rate",
                "VALUE": "5.6",
            },
            {
                "REF_DATE": "2019",
                "GEO": "Ontario",
                "Labour force characteristics": "Participation rate",
                "VALUE": "65.8",
            },
            {
                "REF_DATE": "2019",
                "GEO": "Alberta",
                "Labour force characteristics": "Employment rate",
                "VALUE": "70.0",
            },
        ]
        out = transform_lfs_ontario_annual(rows)
        assert len(out) == 1
        assert out[0]["year"] == 2019
        assert out[0]["employment_rate"] == 62.1
        assert out[0]["unemployment_rate"] == 5.6
        assert out[0]["participation_rate"] == 65.8

    def test_skips_incomplete_year(self):
        rows = [
            {
                "REF_DATE": "2020",
                "GEO": "Ontario",
                "Labour force characteristics": "Employment rate",
                "VALUE": "60",
            },
        ]
        assert transform_lfs_ontario_annual(rows) == []
