from sqlalchemy.orm import Session

from app.ai import embed
from app.models import DecisionItem


def similar_items(db: Session, project_id: int, query: str, k: int = 8) -> list[DecisionItem]:
    vector = embed(query)
    return (
        db.query(DecisionItem)
        .filter_by(project_id=project_id)
        .order_by(DecisionItem.embedding.cosine_distance(vector))
        .limit(k)
        .all()
    )


def item_to_context(item: DecisionItem) -> dict:
    return {
        "source_type": item.source_type,
        "source_id": item.source_id,
        "title": item.title,
        "content": item.content,
        "url": item.url,
        "author": item.author,
        "occurred_at": item.occurred_at.isoformat() if item.occurred_at else None,
    }
