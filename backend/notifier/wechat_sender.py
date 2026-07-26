"""WeChat notification placeholder for phase 2."""

from typing import Dict


def send_wechat(job: Dict[str, str], recipient: str) -> None:
    """Stub implementation for WeChat delivery."""
    print(f"[wechat] To={recipient} Job={job.get('title', 'unknown')}")
