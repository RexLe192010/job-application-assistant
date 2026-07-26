"""Job scraper placeholder for phase 2."""

from dataclasses import dataclass
from typing import List


@dataclass
class JobPosting:
    source: str
    title: str
    url: str
    location: str


def fetch_jobs() -> List[JobPosting]:
    """Return a placeholder list until real scraper logic is added."""
    return []
