from datetime import datetime

import httpx


def fetch_issues(
    project_key: str, base_url: str, email: str, api_token: str, max_results: int = 200
) -> list[dict]:
    items: list[dict] = []
    start_at = 0
    auth = (email, api_token)
    with httpx.Client(timeout=30, auth=auth) as client:
        while True:
            r = client.get(
                f"{base_url}/rest/api/3/search",
                params={
                    "jql": f"project={project_key} ORDER BY updated DESC",
                    "startAt": start_at,
                    "maxResults": min(100, max_results - len(items)),
                    "fields": "summary,description,creator,created,comment",
                },
            )
            r.raise_for_status()
            data = r.json()
            issues = data.get("issues", [])
            if not issues:
                break
            for issue in issues:
                fields = issue["fields"]
                desc = _extract_text(fields.get("description"))
                content = f"{fields['summary']}\n\n{desc}"
                items.append(
                    {
                        "source_type": "jira",
                        "source_id": issue["key"],
                        "title": fields["summary"][:500],
                        "content": content,
                        "url": f"{base_url}/browse/{issue['key']}",
                        "author": (fields.get("creator") or {}).get("displayName"),
                        "occurred_at": _parse_date(fields["created"]),
                    }
                )
            start_at += len(issues)
            if len(items) >= max_results or start_at >= data.get("total", 0):
                break
    return items


def _extract_text(adf: dict | None) -> str:
    """Jira Cloud descriptions are Atlassian Document Format; pull plain text out of it."""
    if not adf:
        return ""
    parts: list[str] = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "text":
                parts.append(node.get("text", ""))
            for child in node.get("content", []) or []:
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(adf)
    return " ".join(parts)


def _parse_date(s: str) -> datetime:
    return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")
