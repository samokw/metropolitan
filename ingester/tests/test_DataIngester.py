"""
Tests for the DataIngester ETL orchestrator.
"""

import os
import pytest
from unittest.mock import patch, MagicMock, mock_open
from src.DataIngester import (
    DataIngester,
    _parse_labour_pumf_urls,
    resolve_labour_pumf_download_urls,
)
from src.pipeline.metrics import PipelineMetrics


@pytest.fixture
def data_ingester():
    with patch("src.DataIngester.DatabaseHandler"):
        with patch.dict(
            os.environ,
            {
                "STATCAN_LABOUR_URL": "https://example.com/labour.zip",
                "STATCAN_LABOUR_PUMF_SOURCES": "",
            },
            clear=False,
        ):
            ingester = DataIngester(False)
            ingester.housing_url = "https://example.com/housing.zip"
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
        {"PROV": "35", "EDUC": "4", "LFSSTAT": "1", "SURVYEAR": "2024", "SURVMNTH": "3"},
        {"PROV": "35", "EDUC": "2", "LFSSTAT": "3", "SURVYEAR": "2024", "SURVMNTH": "3"},
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
        "src.DataIngester.download_labour_pumf_waves",
        return_value=([(mock_labour_csv_rows, "pub0324.csv")], 3000, "Sat, 01 Jan 2000 00:00:00 GMT"),
    ), patch("src.DataIngester.load_labour_records") as mock_load, patch(
        "src.DataIngester.save_pipeline_run"
    ), patch("src.DataIngester.pumf_zip_head_last_modified", return_value=None), patch(
        "src.DataIngester.load_pumf_wave_sync_state", return_value={}
    ), patch("src.DataIngester.save_pumf_wave_sync_state"):
        metrics = data_ingester.run_labour_pipeline()
        assert metrics.records_extracted == 2
        assert metrics.records_transformed == 2
        mock_load.assert_called_once()


def test_parse_labour_pumf_urls():
    assert _parse_labour_pumf_urls(None) == []
    assert _parse_labour_pumf_urls("") == []
    assert _parse_labour_pumf_urls("  ") == []
    raw = "https://a/x.zip, https://b/y.zip\nhttps://c/z.zip"
    assert _parse_labour_pumf_urls(raw) == [
        "https://a/x.zip",
        "https://b/y.zip",
        "https://c/z.zip",
    ]


def test_run_labour_pipeline_skips_when_no_urls(data_ingester):
    with patch.dict(
        os.environ,
        {"STATCAN_LABOUR_URL": "", "STATCAN_LABOUR_PUMF_SOURCES": ""},
        clear=False,
    ), patch("src.DataIngester.download_labour_pumf_waves") as dl, patch(
        "src.DataIngester.save_pipeline_run"
    ) as save:
        metrics = data_ingester.run_labour_pipeline()
        dl.assert_not_called()
        save.assert_not_called()
        assert metrics.records_loaded == 0


def test_run_labour_pipeline_multiple_waves(data_ingester, mock_labour_csv_rows):
    rows_april = [
        {"PROV": "35", "EDUC": "4", "LFSSTAT": "1", "SURVYEAR": "2024", "SURVMNTH": "4"},
    ]
    with patch.dict(
        os.environ,
        {
            "STATCAN_LABOUR_URL": "https://example.com/a.zip,https://example.com/b.zip",
            "STATCAN_LABOUR_PUMF_SOURCES": "",
        },
        clear=False,
    ), patch(
        "src.DataIngester.download_labour_pumf_waves",
        side_effect=[
            ([(mock_labour_csv_rows, "a.csv")], 100, None),
            ([(rows_april, "b.csv")], 200, None),
        ],
    ), patch("src.DataIngester.load_labour_records") as mock_load, patch(
        "src.DataIngester.save_pipeline_run"
    ), patch("src.DataIngester.pumf_zip_head_last_modified", return_value=None), patch(
        "src.DataIngester.load_pumf_wave_sync_state", return_value={}
    ), patch("src.DataIngester.save_pumf_wave_sync_state"):
        metrics = data_ingester.run_labour_pipeline()
        assert mock_load.call_count == 2
        assert metrics.records_extracted == 3


def test_resolve_labour_pumf_sources_expands_default_base():
    with patch.dict(
        os.environ,
        {
            "STATCAN_LABOUR_PUMF_SOURCES": "hist:2025,2026-01",
            "STATCAN_LABOUR_URL": "https://should-be-ignored/x.zip",
        },
        clear=False,
    ):
        urls = resolve_labour_pumf_download_urls()
    assert urls == [
        "https://www150.statcan.gc.ca/n1/pub/71m0001x/2021001/hist/2025-CSV.zip",
        "https://www150.statcan.gc.ca/n1/pub/71m0001x/2021001/2026-01-CSV.zip",
    ]


def test_resolve_labour_pumf_sources_custom_base_and_full_url():
    with patch.dict(
        os.environ,
        {
            "STATCAN_LABOUR_PUMF_BASE_URL": "https://example.com/x",
            "STATCAN_LABOUR_PUMF_SOURCES": "2026-02,https://other.example/y.zip",
            "STATCAN_LABOUR_URL": "",
        },
        clear=False,
    ):
        urls = resolve_labour_pumf_download_urls()
    assert set(urls) == {
        "https://example.com/x/2026-02-CSV.zip",
        "https://other.example/y.zip",
    }


def test_resolve_labour_pumf_sources_invalid_token():
    with patch.dict(os.environ, {"STATCAN_LABOUR_PUMF_SOURCES": "not-a-token"}, clear=False):
        with pytest.raises(ValueError, match="Invalid STATCAN_LABOUR_PUMF_SOURCES"):
            resolve_labour_pumf_download_urls()


def test_resolve_discover_token_merges_with_explicit_month():
    with patch.dict(
        os.environ,
        {
            "STATCAN_LABOUR_PUMF_SOURCES": "discover,2026-04",
            "STATCAN_LABOUR_PUMF_BASE_URL": "https://example.com/x",
            "STATCAN_LABOUR_PUMF_AUTO_HIST": "false",
        },
        clear=False,
    ), patch(
        "src.DataIngester.expand_discover_urls",
        return_value=["https://discovered/month-2026-03-CSV.zip"],
    ):
        urls = resolve_labour_pumf_download_urls()
    assert "https://discovered/month-2026-03-CSV.zip" in urls
    assert "https://example.com/x/2026-04-CSV.zip" in urls


def test_resolve_min_reference_invalid():
    with patch.dict(
        os.environ,
        {
            "STATCAN_LABOUR_PUMF_SOURCES": "2026-01",
            "STATCAN_LABOUR_PUMF_MIN_REFERENCE": "bad",
        },
        clear=False,
    ):
        with pytest.raises(ValueError, match="Invalid STATCAN_LABOUR_PUMF_MIN_REFERENCE"):
            resolve_labour_pumf_download_urls()


def test_run_labour_skips_download_when_last_modified_unchanged(data_ingester):
    with patch.dict(
        os.environ, {"STATCAN_LABOUR_PUMF_SKIP_UNCHANGED": "true"}, clear=False
    ), patch(
        "src.DataIngester.load_pumf_wave_sync_state",
        return_value={"https://example.com/labour.zip": "Thu, 01 Jan 2000 00:00:00 GMT"},
    ), patch(
        "src.DataIngester.pumf_zip_head_last_modified",
        return_value="Thu, 01 Jan 2000 00:00:00 GMT",
    ), patch("src.DataIngester.download_labour_pumf_waves") as dl, patch(
        "src.DataIngester.save_pipeline_run"
    ):
        data_ingester.run_labour_pipeline()
    dl.assert_not_called()


def test_run_labour_pipeline_invalid_sources_records_error():
    with patch.dict(os.environ, {"STATCAN_LABOUR_PUMF_SOURCES": "not-a-token"}, clear=False):
        with patch("src.DataIngester.DatabaseHandler"):
            ingester = DataIngester(False)
            metrics = ingester.run_labour_pipeline()
    assert len(metrics.errors) == 1
    assert "Invalid" in metrics.errors[0]["message"]


def test_run_labour_pipeline_download_failure(data_ingester):
    with patch(
        "src.DataIngester.download_labour_pumf_waves",
        side_effect=RuntimeError("Download failed"),
    ), patch("src.DataIngester.save_pipeline_run"), patch(
        "src.DataIngester.pumf_zip_head_last_modified", return_value=None
    ), patch("src.DataIngester.load_pumf_wave_sync_state", return_value={}), patch(
        "src.DataIngester.save_pumf_wave_sync_state"
    ):
        metrics = data_ingester.run_labour_pipeline()
        assert metrics.records_extracted == 0
        assert len(metrics.errors) == 1


def test_process_and_store_saves_update_on_success(data_ingester):
    housing_metrics = PipelineMetrics(source="housing", records_loaded=5)
    labour_metrics = PipelineMetrics(source="labour", records_loaded=3)
    lfs_metrics = PipelineMetrics(source="lfs_ontario", records_loaded=0)

    with patch.object(
        data_ingester, "run_housing_pipeline", return_value=housing_metrics
    ), patch.object(
        data_ingester, "run_labour_pipeline", return_value=labour_metrics
    ), patch.object(
        data_ingester, "run_lfs_ontario_pipeline", return_value=lfs_metrics
    ), patch.object(
        data_ingester, "save_last_update"
    ) as mock_save:
        data_ingester.process_and_store()
        mock_save.assert_called_once()


def test_process_and_store_no_save_when_nothing_loaded(data_ingester):
    housing_metrics = PipelineMetrics(source="housing", records_loaded=0)
    labour_metrics = PipelineMetrics(source="labour", records_loaded=0)
    lfs_metrics = PipelineMetrics(source="lfs_ontario", records_loaded=0)

    with patch.object(
        data_ingester, "run_housing_pipeline", return_value=housing_metrics
    ), patch.object(
        data_ingester, "run_labour_pipeline", return_value=labour_metrics
    ), patch.object(
        data_ingester, "run_lfs_ontario_pipeline", return_value=lfs_metrics
    ), patch.object(
        data_ingester, "save_last_update"
    ) as mock_save:
        data_ingester.process_and_store()
        mock_save.assert_not_called()


def test_run_lfs_ontario_pipeline_skips_without_url(data_ingester):
    data_ingester.lfs_summary_url = None
    with patch("src.DataIngester.download_and_extract_csv") as dl, patch(
        "src.DataIngester.save_pipeline_run"
    ) as save:
        metrics = data_ingester.run_lfs_ontario_pipeline()
        dl.assert_not_called()
        save.assert_not_called()
        assert metrics.records_loaded == 0


def test_run_lfs_ontario_pipeline_success(data_ingester):
    data_ingester.lfs_summary_url = "https://example.com/lfs.zip"
    lfs_rows = [
        {
            "REF_DATE": "2020",
            "GEO": "Ontario",
            "Labour force characteristics": "Employment rate",
            "VALUE": "60.0",
        },
        {
            "REF_DATE": "2020",
            "GEO": "Ontario",
            "Labour force characteristics": "Unemployment rate",
            "VALUE": "7.0",
        },
        {
            "REF_DATE": "2020",
            "GEO": "Ontario",
            "Labour force characteristics": "Participation rate",
            "VALUE": "65.0",
        },
    ]
    with patch(
        "src.DataIngester.download_and_extract_csv",
        return_value=(lfs_rows, 1000),
    ), patch("src.DataIngester.load_lfs_ontario_records") as mock_load, patch(
        "src.DataIngester.save_pipeline_run"
    ):
        metrics = data_ingester.run_lfs_ontario_pipeline()
        assert metrics.records_extracted == 3
        assert metrics.records_transformed == 1
        mock_load.assert_called_once()
