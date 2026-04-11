"""
Tests for the extract stage of the ETL pipeline.
"""

import io
import csv
import zipfile
import pytest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock
from src.pipeline.extract import download_and_extract_csv, download_labour_pumf_waves


def _make_zip_with_csv(rows, filename="data.csv"):
    """Helper: create an in-memory ZIP containing a CSV file."""
    buf = io.BytesIO()
    csv_buf = io.StringIO()
    writer = csv.DictWriter(csv_buf, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(filename, csv_buf.getvalue())

    return buf.getvalue()


class TestDownloadAndExtractCsv:
    def test_successful_extraction(self):
        csv_rows = [{"COL_A": "1", "COL_B": "2"}]
        zip_bytes = _make_zip_with_csv(csv_rows)

        mock_response = MagicMock()
        mock_response.content = zip_bytes
        mock_response.raise_for_status = MagicMock()

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            rows, byte_count = download_and_extract_csv("https://example.com/data.zip")

        assert len(rows) == 1
        assert rows[0]["COL_A"] == "1"
        assert byte_count == len(zip_bytes)

    def test_skips_metadata_csv(self):
        csv_rows = [{"COL_A": "val"}]
        buf = io.BytesIO()
        csv_buf = io.StringIO()
        writer = csv.DictWriter(csv_buf, fieldnames=["COL_A"])
        writer.writeheader()
        writer.writerows(csv_rows)

        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("12345_MetaData.csv", "meta,data")
            zf.writestr("12345.csv", csv_buf.getvalue())

        mock_response = MagicMock()
        mock_response.content = buf.getvalue()
        mock_response.raise_for_status = MagicMock()

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            rows, _ = download_and_extract_csv("https://example.com/data.zip")

        assert len(rows) == 1
        assert rows[0]["COL_A"] == "val"

    def test_prefers_pub_csv_over_documents_codebook(self):
        """LFS PUMF zips list codebook CSVs under Documents/ before pubMMYY.csv."""
        data_row = {"PROV": "35", "EDUC": "1", "LFSSTAT": "1", "SURVYEAR": "2026", "SURVMNTH": "2"}
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr(
                "Documents/LFS_PUMF_EPA_FGMD_codebook.csv",
                "col1,col2\nx,y\n",
            )
            zf.writestr(
                "pub0226.csv",
                "PROV,EDUC,LFSSTAT,SURVYEAR,SURVMNTH\n35,1,1,2026,2\n",
            )

        mock_response = MagicMock()
        mock_response.content = buf.getvalue()
        mock_response.raise_for_status = MagicMock()

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            rows, _ = download_and_extract_csv("https://example.com/pumf.zip")

        assert len(rows) == 1
        assert rows[0]["PROV"] == "35"

    def test_labour_pumf_hist_bundle_yields_each_pub_csv(self):
        """Annual hist ZIPs nest pubMMYY.csv under a folder (e.g. 2025-CSV.zip/pub0125.csv)."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr(
                "2025-CSV.zip/Documents/LFS_PUMF_codebook.csv",
                "a,b\n1,2\n",
            )
            zf.writestr(
                "2025-CSV.zip/pub0125.csv",
                "PROV,EDUC,LFSSTAT,SURVYEAR,SURVMNTH\n35,1,1,2025,1\n",
            )
            zf.writestr(
                "2025-CSV.zip/pub0225.csv",
                "PROV,EDUC,LFSSTAT,SURVYEAR,SURVMNTH\n35,2,3,2025,2\n",
            )

        mock_response = MagicMock()
        mock_response.content = buf.getvalue()
        mock_response.raise_for_status = MagicMock()
        mock_response.headers = SimpleNamespace(get=lambda _k, _d=None: None)

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            waves, byte_count, lm = download_labour_pumf_waves("https://example.com/hist.zip")

        assert byte_count == len(buf.getvalue())
        assert lm is None
        assert len(waves) == 2
        assert waves[0][0][0]["SURVMNTH"] == "1"
        assert waves[1][0][0]["SURVMNTH"] == "2"

    def test_download_failure_raises(self):
        import requests as req

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = req.exceptions.HTTPError("404")

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            with pytest.raises(req.exceptions.HTTPError):
                download_and_extract_csv("https://example.com/bad.zip")

    def test_no_csv_in_zip_raises(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("readme.txt", "not a csv")

        mock_response = MagicMock()
        mock_response.content = buf.getvalue()
        mock_response.raise_for_status = MagicMock()

        with patch("src.pipeline.extract.requests.get", return_value=mock_response):
            with pytest.raises(RuntimeError, match="No data CSV found"):
                download_and_extract_csv("https://example.com/data.zip")
