from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Iterable


def normalize_text(text: str | None) -> list[str]:
    if not text:
        return []
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return [token for token in cleaned.split() if token]


def calculate_matching_score(resume_text: str | None, *job_fields: Iterable[str | None]) -> float:
    if not resume_text:
        return 0.0
    resume_tokens = set(normalize_text(resume_text))
    if not resume_tokens:
        return 0.0

    job_tokens: list[str] = []
    for field in job_fields:
        if isinstance(field, str):
            job_tokens.extend(normalize_text(field))
        elif isinstance(field, Iterable):
            for value in field:
                if isinstance(value, str):
                    job_tokens.extend(normalize_text(value))
    if not job_tokens:
        return 0.0

    matches = sum(1 for token in job_tokens if token in resume_tokens)
    return round((matches / len(job_tokens)) * 100, 2)


def filter_by_timeframe(query, timeframe: str | None, column):
    if not timeframe or timeframe == "all":
        return query

    now = datetime.utcnow()
    mapping = {
        "24h": now - timedelta(hours=24),
        "3d": now - timedelta(days=3),
        "5d": now - timedelta(days=5),
    }
    cutoff = mapping.get(timeframe)
    if cutoff:
        query = query.where(column >= cutoff)
    return query
