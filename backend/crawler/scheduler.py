"""Scheduler placeholder for phase 2."""

from crawler.scraper import fetch_jobs


def run_once() -> int:
    jobs = fetch_jobs()
    return len(jobs)


if __name__ == "__main__":
    count = run_once()
    print(f"Fetched {count} jobs")
