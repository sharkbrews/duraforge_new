"""Structured logging: JSON lines on disk, readable one-liners on the console.

Worker processes never write to the log file (concurrent appends corrupt lines
on Windows); they return warnings inside their results and the parent logs them.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

LOGGER_NAME = "pdfmd"
_RESERVED = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    """One JSON object per line; any ``extra=`` fields become top-level keys."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


class ConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        extras = {k: v for k, v in record.__dict__.items() if k not in _RESERVED and not k.startswith("_")}
        tail = " " + " ".join(f"{k}={v}" for k, v in extras.items()) if extras else ""
        return f"{record.levelname:<7} {record.getMessage()}{tail}"


def configure_logging(log_dir: Path, run_name: str, verbose: bool = False) -> Path:
    """Attach a JSONL file handler and a console handler. Returns the log path."""
    log_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = log_dir / f"{run_name}-{stamp}.jsonl"

    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()
    logger.propagate = False

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(JsonFormatter())

    console = logging.StreamHandler(sys.stderr)
    console.setLevel(logging.DEBUG if verbose else logging.INFO)
    console.setFormatter(ConsoleFormatter())

    logger.addHandler(file_handler)
    logger.addHandler(console)
    return log_path


class StructLogger:
    """Tiny wrapper so call sites can write ``log.info("msg", pages=3)``."""

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def _emit(self, level: int, msg: str, exc_info: bool, ctx: dict[str, object]) -> None:
        safe = {(f"ctx_{k}" if k in _RESERVED else k): v for k, v in ctx.items()}
        self._logger.log(level, msg, exc_info=exc_info, extra=safe)

    def debug(self, msg: str, **ctx: object) -> None:
        self._emit(logging.DEBUG, msg, False, ctx)

    def info(self, msg: str, **ctx: object) -> None:
        self._emit(logging.INFO, msg, False, ctx)

    def warning(self, msg: str, **ctx: object) -> None:
        self._emit(logging.WARNING, msg, False, ctx)

    def error(self, msg: str, **ctx: object) -> None:
        self._emit(logging.ERROR, msg, False, ctx)

    def exception(self, msg: str, **ctx: object) -> None:
        self._emit(logging.ERROR, msg, True, ctx)


def get_logger(suffix: str = "") -> StructLogger:
    return StructLogger(logging.getLogger(f"{LOGGER_NAME}.{suffix}" if suffix else LOGGER_NAME))


def reconfigure_stdout_utf8() -> None:
    """Project rule: every script handles UTF-8 explicitly on Windows consoles."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
