"""Data model placeholders for phase 2."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class JobRecord:
    source: str
    external_id: str
    title: str
    url: str
    status: str
    created_at: datetime
