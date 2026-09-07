from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project


def get_project_from_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"), db: Session = Depends(get_db)
) -> Project:
    project = db.query(Project).filter_by(api_key=x_api_key).first()
    if project is None:
        raise HTTPException(401, "Invalid API key")
    return project
