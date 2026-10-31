
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class JSONFormatter(logging.Formatter):
    """Format log records as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)


def configure_logging(debug: bool = False) -> None:
    """Configure consistent application-wide JSON logging."""

    root_logger = logging.getLogger()

    # Avoid adding duplicate handlers if configuration runs more than once.
    if getattr(root_logger, "_taskforge_configured", False):
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    root_logger.setLevel(
        logging.DEBUG if debug else logging.INFO
    )

    root_logger._taskforge_configured = True
