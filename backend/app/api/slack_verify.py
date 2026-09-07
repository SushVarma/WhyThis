import hashlib
import hmac
import time

from fastapi import HTTPException


def verify_slack_signature(
    body: bytes, timestamp: str, signature: str, signing_secret: str
) -> None:
    """Raises 401 unless the request carries a valid Slack signing-secret HMAC,
    per https://api.slack.com/authentication/verifying-requests-from-slack.
    `signing_secret` is per-project since each client connects their own Slack app."""
    if not timestamp or abs(time.time() - int(timestamp)) > 60 * 5:
        raise HTTPException(401, "Stale or missing Slack request timestamp")

    basestring = f"v0:{timestamp}:{body.decode()}"
    computed = "v0=" + hmac.new(
        signing_secret.encode(), basestring.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed, signature):
        raise HTTPException(401, "Invalid Slack signature")
