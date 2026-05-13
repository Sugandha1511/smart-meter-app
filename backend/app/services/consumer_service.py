import gzip
import json
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / 'data' / 'consumers.json.gz'

_CONSUMER_DB: dict[str, dict] | None = None


def _load() -> dict[str, dict]:
    global _CONSUMER_DB
    if _CONSUMER_DB is None:
        with gzip.open(DATA_PATH, 'rb') as f:
            _CONSUMER_DB = json.loads(f.read().decode('utf-8'))
    return _CONSUMER_DB


def lookup_consumer(consumer_ivrs: str, dc: str) -> dict | None:
    """Return consumer master data if IVRS exists and belongs to the given DC."""
    db = _load()
    record = db.get(consumer_ivrs.strip())
    if record is None:
        return None
    if record.get('dc') != dc:
        return None
    return record


def consumer_exists(consumer_ivrs: str) -> bool:
    db = _load()
    return consumer_ivrs.strip() in db
