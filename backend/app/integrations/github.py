from datetime import datetime

import httpx

API = "https://api.github.com"


def _headers(token: str):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }


def fetch_commits(repo: str, token: str, per_page: int = 100, max_pages: int = 3) -> list[dict]:
    """repo: 'owner/name'. Returns commit list with messages (the 'why' developers write)."""
    items = []
    with httpx.Client(timeout=30) as client:
        for page in range(1, max_pages + 1):
            r = client.get(
                f"{API}/repos/{repo}/commits",
                headers=_headers(token),
                params={"per_page": per_page, "page": page},
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            for c in batch:
                commit = c["commit"]
                items.append(
                    {
                        "source_type": "github_commit",
                        "source_id": c["sha"],
                        "title": commit["message"].splitlines()[0][:500],
                        "content": commit["message"],
                        "url": c["html_url"],
                        "author": commit["author"]["name"] if commit.get("author") else None,
                        "occurred_at": _parse_date(commit["author"]["date"])
                        if commit.get("author")
                        else None,
                    }
                )
    return items


def fetch_pull_requests(
    repo: str, token: str, per_page: int = 100, max_pages: int = 3
) -> list[dict]:
    """PR titles/descriptions/review discussion are the richest 'decision' source."""
    items = []
    with httpx.Client(timeout=30) as client:
        for page in range(1, max_pages + 1):
            r = client.get(
                f"{API}/repos/{repo}/pulls",
                headers=_headers(token),
                params={"state": "all", "per_page": per_page, "page": page},
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            for pr in batch:
                body = pr.get("body") or ""
                content = f"PR #{pr['number']}: {pr['title']}\n\n{body}"
                items.append(
                    {
                        "source_type": "github_pr",
                        "source_id": str(pr["number"]),
                        "title": pr["title"][:500],
                        "content": content,
                        "url": pr["html_url"],
                        "author": pr["user"]["login"] if pr.get("user") else None,
                        "occurred_at": _parse_date(pr["created_at"]),
                    }
                )
    return items


def _parse_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")
