"""
Tests for the DataIngester ETL orchestrator.
"""

import pytest
from unittest.mock import patch, MagicMock, mock_open
from src.DataIngester import DataIngester
from src.pipeline.metrics import PipelineMetrics


@pytest.fixture
def data_ingester():
    with patch("src.DataIngester.DatabaseHandler"):
        ingester = DataIngester(False)
        ingester.housing_url = "https://example.com/housing.zip"
        ingester.labour_url = "https://example.com/labour.zip"
        yield ingester


@pytest.fixture
def mock_housing_csv_rows():
    """Simulates rows extracted from the StatCan housing CSV."""
    return [
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing starts",
            "Type of unit": "Single-detached units",
            "VALUE": "200",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing starts",
            "Type of unit": "Semi-detached units",
            "VALUE": "100",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing starts",
            "Type of unit": "Row units",
            "VALUE": "300",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing starts",
            "Type of unit": "Apartment and other unit types",
            "VALUE": "900",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing starts",
            "Type of unit": "Total units",
            "VALUE": "1500",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing completions",
            "Type of unit": "Single-detached units",
            "VALUE": "180",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing completions",
            "Type of unit": "Semi-detached units",
            "VALUE": "90",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing completions",
            "Type of unit": "Row units",
            "VALUE": "280",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing completions",
            "Type of unit": "Apartment and other unit types",
            "VALUE": "650",
        },
        {
            "REF_DATE": "2024-01",
            "GEO": "Toronto, Ontario",
            "Housing estimates": "Housing completions",
            "Type of unit": "Total units",
            "VALUE": "1200",
        },
    ]


@pytest.fixture
def mock_labour_csv_rows():
    """Simulates rows extracted from the LFS PUMF CSV."""
    return [
        {"PROV": "35", "EDUC": "4", "LFSSTAT": "1"},
        {"PROV": "35", "EDUC": "2", "LFSSTAT": "3"},
    ]


def test_get_last_update_file_exists(data_ingester):
    with patch("builtins.open", mock_open(read_data="2025-02-27")):
        assert data_ingester.get_last_update() == "2025-02-27"


def test_get_last_update_file_missing(data_ingester):
    with patch("builtins.open", side_effect=FileNotFoundError):
        assert data_ingester.get_last_update() is None


def test_save_last_update(data_ingester):
    mock_file = mock_open()
    with patch("builtins.open", mock_file):
        data_ingester.save_last_update()
        mock_file.assert_called_once()
        mock_file().write.assert_called_once()
        assert len(mock_file().write.call_args[0][0]) == 10


def test_run_housing_pipeline_success(data_ingester, mock_housing_csv_rows):
    with patch(
        "src.DataIngester.download_and_extract_csv",
        return_value=(mock_housing_csv_rows, 5000),
    ), patch("src.DataIngester.load_housing_records") as mock_load, patch(
        "src.DataIngester.save_pipeline_run"
    ):
        metrics = data_ingester.run_housing_pipeline()
        assert metrics.records_extracted == 10
        assert metrics.records_transformed == 1
        mock_load.assert_called_once()


def test_run_housing_pipeline_download_failure(data_ingester):
    with patch(
        "src.DataIngester.download_and_extract_csv",
        side_effect=RuntimeError("Download failed"),
    ), patch("src.DataIngester.save_pipeline_run"):
        metrics = data_ingester.run_housing_pipeline()
        assert metrics.records_extracted == 0
        assert len(metrics.errors) == 1
        assert "Download failed" in metrics.errors[0]["message"]


def test_run_labour_pipeline_success(data_ingester, mock_labour_csv_rows):
    with patch(
        "src.DataIngester.download_and_extract_csv",
        return_value=(mock_labour_csv_rows, 3000),
    ), patch("src.DataIngester.load_labour_records") as mock_load, patch(
        "src.DataIngester.save_pipeline_run"
    ):
        metrics = data_ingester.run_labour_pipeline()
        assert metrics.records_extracted == 2
        assert metrics.records_transformed == 2
        mock_load.assert_called_once()


def test_run_labour_pipeline_download_failure(data_ingester):
    with patch(
        "src.DataIngester.download_and_extract_csv",
        side_effect=RuntimeError("Download failed"),
    ), patch("src.DataIngester.save_pipeline_run"):
        metrics = data_ingester.run_labour_pipeline()
        assert metrics.records_extracted == 0
        assert len(metrics.errors) == 1


def test_process_and_store_saves_update_on_success(data_ingester):
    housing_metrics = PipelineMetrics(source="housing", records_loaded=5)
    labour_metrics = PipelineMetrics(source="labour", records_loaded=3)

    with patch.object(
        data_ingester, "run_housing_pipeline", return_value=housing_metrics
    ), patch.object(
        data_ingester, "run_labour_pipeline", return_value=labour_metrics
    ), patch.object(
        data_ingester, "save_last_update"
    ) as mock_save:
        data_ingester.process_and_store()
        mock_save.assert_called_once()


def test_process_and_store_no_save_when_nothing_loaded(data_ingester):
    housing_metrics = PipelineMetrics(source="housing", records_loaded=0)
    labour_metrics = PipelineMetrics(source="labour", records_loaded=0)

    with patch.object(
        data_ingester, "run_housing_pipeline", return_value=housing_metrics
    ), patch.object(
        data_ingester, "run_labour_pipeline", return_value=labour_metrics
    ), patch.object(
        data_ingester, "save_last_update"
    ) as mock_save:
        data_ingester.process_and_store()
        mock_save.assert_not_called()
