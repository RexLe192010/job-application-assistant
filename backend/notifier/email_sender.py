"""Email notification placeholder for phase 2."""

from typing import Dict


def send_email(job: Dict[str, str], to_email: str) -> None:
    """Stub implementation for email delivery."""
    print(f"[email] To={to_email} Job={job.get('title', 'unknown')}")
