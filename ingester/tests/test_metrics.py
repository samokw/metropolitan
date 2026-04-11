"""
Tests for pipeline metrics tracking.
"""

from src.pipeline.metrics import PipelineMetrics


class TestPipelineMetrics:
    def test_initial_state(self):
        m = PipelineMetrics(source="housing")
        assert m.records_extracted == 0
        assert m.records_loaded == 0
        assert m.success_rate == 0.0

    def test_success_rate(self):
        m = PipelineMetrics(source="housing", records_extracted=100, records_loaded=95)
        assert m.success_rate == 95.0

    def test_success_rate_zero_extracted(self):
        m = PipelineMetrics(source="housing")
        assert m.success_rate == 0.0

    def test_add_error(self):
        m = PipelineMetrics(source="housing")
        m.add_error("extract", "Connection timeout")
        assert len(m.errors) == 1
        assert m.errors[0]["stage"] == "extract"
        assert "timeout" in m.errors[0]["message"]

    def test_timing(self):
        m = PipelineMetrics(source="housing")
        m.start()
        m.stop()
        assert m.duration_seconds >= 0

    def test_summary_keys(self):
        m = PipelineMetrics(source="labour")
        summary = m.summary()
        expected_keys = {
            "source", "records_extracted", "records_transformed",
            "records_loaded", "records_rejected", "bytes_downloaded",
            "estimated_bytes_loaded", "success_rate_pct",
            "duration_seconds", "error_count",
        }
        assert set(summary.keys()) == expected_keys
        assert summary["source"] == "labour"
