"""Relevance matcher placeholder for phase 2."""

from typing import Dict


def score_job(job: Dict[str, str], profile: Dict[str, str]) -> float:
    """Simple baseline scoring to be replaced by AI logic later."""
    if not job or not profile:
        return 0.0

    title = (job.get("title") or "").lower()
    target = (profile.get("target_role") or "").lower()
    if target and target in title:
        return 0.8
    return 0.2
