"""Akses database MySQL eksternal (Ubuntu host, bukan container)."""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

_engine: Optional[Engine] = None


def get_engine() -> Optional[Engine]:
    """Koneksi lazy ke MySQL. Kembalikan None jika belum dikonfigurasi.

    Prioritas: DATABASE_URL > MYSQL_* > sqlite dev fallback.
    """
    global _engine  # noqa: PLW0603
    if _engine is not None:
        return _engine
    url = os.getenv("DATABASE_URL")
    if not url:
        host = os.getenv("MYSQL_HOST", "").strip()
        if host:
            port = os.getenv("MYSQL_PORT", "3306")
            database = os.getenv("MYSQL_DATABASE", "blanko_ppat")
            user = os.getenv("MYSQL_USER", "webuser")
            password = os.getenv("MYSQL_PASSWORD", "CHANGE_ME")
            url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
        else:
            url = "sqlite:///./blanko_ppat_dev.db"
    try:
        _engine = create_engine(url, pool_pre_ping=True, pool_recycle=280)
        with _engine.connect():
            pass
        return _engine
    except Exception:  # noqa: BLE001
        # API tetap dapat berjalan (mode degraded) tanpa database.
        _engine = None
        return None


def run_query(engine: Optional[Engine], query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    if engine is None:
        return []
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        keys = list(result.keys())
        return [dict(zip(keys, row)) for row in result.fetchall()]
