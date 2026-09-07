from sqlalchemy.orm import Session

from app.ai import embed
from app.models import DecisionItem


def upsert_items(db: Session, project_id: int, items: list[dict]) -> int:
    """Embeds and stores items for one client project, skipping re-embedding for ones
    already indexed (matched by project_id + source_type + source_id)."""
    count = 0
    for item in items:
        exists = (
            db.query(DecisionItem.id)
            .filter_by(
                project_id=project_id,
                source_type=item["source_type"],
                source_id=item["source_id"],
            )
            .first()
        )
        if exists:
            continue

        vector = embed(item["content"])
        db.add(
            DecisionItem(
                project_id=project_id,
                source_type=item["source_type"],
                source_id=item["source_id"],
                title=item.get("title"),
                content=item["content"],
                url=item.get("url"),
                author=item.get("author"),
                occurred_at=item.get("occurred_at"),
                embedding=vector,
            )
        )
        count += 1
    db.commit()
    return count
