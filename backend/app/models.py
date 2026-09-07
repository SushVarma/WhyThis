import secrets
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db import Base

EMBEDDING_DIM = 384  # sentence-transformers/all-MiniLM-L6-v2


def generate_api_key() -> str:
    return "wt_" + secrets.token_urlsafe(24)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="organization")


class Project(Base):
    """One client's isolated workspace: its own API key and its own GitHub/Slack/Jira
    credentials, so a single WhyThis deployment can serve multiple client companies."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, default=generate_api_key)
    created_at = Column(DateTime, default=datetime.utcnow)

    github_token = Column(String(500))
    github_repo = Column(String(255))  # "owner/repo"

    slack_bot_token = Column(String(500))
    slack_signing_secret = Column(String(255))
    slack_team_id = Column(String(64))  # routes an incoming /why-this slash command here

    jira_base_url = Column(String(500))
    jira_email = Column(String(255))
    jira_api_token = Column(String(500))
    jira_project_key = Column(String(64))

    organization = relationship("Organization", back_populates="projects")

    __table_args__ = (Index("ix_projects_slack_team_id", "slack_team_id", unique=True),)


class DecisionItem(Base):
    """One indexed unit of context: a commit, PR, Slack message, or Jira ticket."""

    __tablename__ = "decision_items"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    source_type = Column(String(20), nullable=False)  # github_commit | github_pr | slack | jira
    source_id = Column(String(255), nullable=False)  # sha, PR number, message ts, issue key
    title = Column(String(500))
    content = Column(Text, nullable=False)
    url = Column(String(1000))
    author = Column(String(255))
    occurred_at = Column(DateTime)
    extra = Column(JSONB, default=dict)
    embedding = Column(Vector(EMBEDDING_DIM))
    indexed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index(
            "ix_decision_items_project_source",
            "project_id",
            "source_type",
            "source_id",
            unique=True,
        ),
    )
