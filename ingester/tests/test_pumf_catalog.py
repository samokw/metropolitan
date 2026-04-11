"""Tests for PUMF URL discovery and filtering."""

import os
from unittest.mock import MagicMock, patch

from src.pipeline.pumf_catalog import (
    discover_monthly_pumf_zip_urls,
    filter_urls_by_min_reference,
    finalize_labour_pumf_url_list,
)


def test_discover_monthly_extracts_csv_links():
    html = """
    <p><a href="/n1/pub/71m0001x/2021001/2026-02-CSV.zip">CSV</a></p>
    <a href='https://www150.statcan.gc.ca/n1/pub/71m0001x/2021001/2026-03-CSV.zip'>x</a>
    """
    mock_resp = MagicMock()
    mock_resp.text = html
    mock_resp.raise_for_status = MagicMock()
    with patch("src.pipeline.pumf_catalog.requests.get", return_value=mock_resp):
        urls = discover_monthly_pumf_zip_urls("https://example.com/page.htm")
    assert len(urls) == 2
    assert any("2026-02-CSV.zip" in u for u in urls)
    assert any("2026-03-CSV.zip" in u for u in urls)


def test_filter_urls_by_min_reference():
    u = [
        "https://x/hist/2024-CSV.zip",
        "https://x/2025-06-CSV.zip",
        "https://x/2026-01-CSV.zip",
    ]
    out = filter_urls_by_min_reference(u, "2025-01")
    assert out == [
        "https://x/2025-06-CSV.zip",
        "https://x/2026-01-CSV.zip",
    ]


def test_finalize_dedupes_and_sorts():
    u = [
        "https://x/2026-02-CSV.zip",
        "https://x/2026-01-CSV.zip",
        "https://x/2026-02-CSV.zip",
    ]
    with patch.dict(os.environ, {"STATCAN_LABOUR_PUMF_MIN_REFERENCE": ""}, clear=False):
        out = finalize_labour_pumf_url_list(u)
    assert out == [
        "https://x/2026-01-CSV.zip",
        "https://x/2026-02-CSV.zip",
    ]
