"""
Pipeline run metrics tracked across ETL stages.
"""

import time
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PipelineMetrics:
    """Tracks record counts, data volume, and timing for a pipeline run."""

    source: str = ""
    strategy: str = "bulk"
    records_extracted: int = 0
    records_transformed: int = 0
    records_loaded: int = 0
    records_rejected: int = 0
    bytes_downloaded: int = 0
    estimated_bytes_loaded: int = 0
    errors: list = field(default_factory=list)
    _start_time: float = field(default=0.0, repr=False)
    duration_seconds: float = 0.0

    def start(self):
        """Mark the pipeline start time."""
        self._start_time = time.time()

    def stop(self):
        """Mark the pipeline end time and compute duration."""
        self.duration_seconds = round(time.time() - self._start_time, 2)

    def add_error(self, stage, message):
        """Record a non-fatal error."""
        self.errors.append({"stage": stage, "message": str(message)})

    @property
    def success_rate(self):
        """Percentage of extracted records that were successfully loaded."""
        if self.records_extracted == 0:
            return 0.0
        return round(self.records_loaded / self.records_extracted * 100, 2)

    def summary(self):
        """Return a dict suitable for structured logging or DB storage."""
        return {
            "source": self.source,
            "strategy": self.strategy,
            "records_extracted": self.records_extracted,
            "records_transformed": self.records_transformed,
            "records_loaded": self.records_loaded,
            "records_rejected": self.records_rejected,
            "bytes_downloaded": self.bytes_downloaded,
            "estimated_bytes_loaded": self.estimated_bytes_loaded,
            "success_rate_pct": self.success_rate,
            "duration_seconds": self.duration_seconds,
            "error_count": len(self.errors),
        }

    def log_summary(self):
        """Log the pipeline run summary."""
        logger.info("Pipeline run complete: %s", self.summary())
