from datetime import datetime

import httpx

API = "https://slack.com/api"


def _headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def fetch_channel_history(channel_id: str, token: str, limit: int = 500) -> list[dict]:
    """Pulls messages from a channel the bot has been invited to."""
    items: list[dict] = []
    cursor = None
    with httpx.Client(timeout=30) as client:
        while len(items) < limit:
            params = {"channel": channel_id, "limit": min(200, limit - len(items))}
            if cursor:
                params["cursor"] = cursor
            r = client.get(f"{API}/conversations.history", headers=_headers(token), params=params)
            r.raise_for_status()
            data = r.json()
            if not data.get("ok"):
                raise RuntimeError(f"Slack API error: {data.get('error')}")
            for m in data.get("messages", []):
                if not m.get("text"):
                    continue
                items.append(
                    {
                        "source_type": "slack",
                        "source_id": m["ts"],
                        "title": m["text"][:120],
                        "content": m["text"],
                        "url": f"slack://channel?team=&id={channel_id}&message={m['ts']}",
                        "author": m.get("user"),
                        "occurred_at": datetime.utcfromtimestamp(float(m["ts"])),
                    }
                )
            cursor = data.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break
    return items


def resolve_username(user_id: str, token: str) -> str | None:
    with httpx.Client(timeout=15) as client:
        r = client.get(f"{API}/users.info", headers=_headers(token), params={"user": user_id})
        data = r.json()
        if data.get("ok"):
            return data["user"].get("real_name") or data["user"].get("name")
    return None
