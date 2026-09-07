from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.ai import synthesize_answer
from app.api.auth import get_project_from_api_key
from app.api.schemas import (
    CreateProjectRequest,
    IngestGithubRequest,
    IngestJiraRequest,
    IngestSlackRequest,
    ProjectConfigOut,
    ProjectIntegrationsUpdate,
    ProjectOut,
    WhyThisRequest,
    WhyThisResponse,
)
from app.api.slack_verify import verify_slack_signature
from app.db import get_db
from app.ingest import upsert_items
from app.integrations import github, jira, slack
from app.models import Organization, Project
from app.search import item_to_context, similar_items

router = APIRouter()


def _project_config_out(project: Project) -> ProjectConfigOut:
    return ProjectConfigOut(
        id=project.id,
        name=project.name,
        github_repo=project.github_repo,
        github_connected=bool(project.github_token),
        slack_connected=bool(project.slack_bot_token and project.slack_signing_secret),
        jira_connected=bool(project.jira_base_url and project.jira_api_token),
        jira_project_key=project.jira_project_key,
    )


@router.post("/projects", response_model=ProjectOut)
def create_project(req: CreateProjectRequest, db: Session = Depends(get_db)):
    """Onboarding endpoint: creates an org + client project and returns its API key.
    Not behind auth in this MVP — put it behind real user auth before self-serve signup."""
    org = Organization(name=req.org_name)
    db.add(org)
    db.flush()
    project = Project(organization_id=org.id, name=req.project_name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/me", response_model=ProjectConfigOut)
def get_my_project(project: Project = Depends(get_project_from_api_key)):
    return _project_config_out(project)


@router.patch("/projects/me/integrations", response_model=ProjectConfigOut)
def update_integrations(
    req: ProjectIntegrationsUpdate,
    project: Project = Depends(get_project_from_api_key),
    db: Session = Depends(get_db),
):
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _project_config_out(project)


@router.post("/ingest/github")
def ingest_github(
    req: IngestGithubRequest,
    project: Project = Depends(get_project_from_api_key),
    db: Session = Depends(get_db),
):
    repo = req.repo or project.github_repo
    if not repo or not project.github_token:
        return {"error": "GitHub isn't connected for this project yet — set it up on the Settings page."}
    items = github.fetch_commits(repo, project.github_token) + github.fetch_pull_requests(
        repo, project.github_token
    )
    added = upsert_items(db, project.id, items)
    return {"repo": repo, "fetched": len(items), "newly_indexed": added}


@router.post("/ingest/slack")
def ingest_slack(
    req: IngestSlackRequest,
    project: Project = Depends(get_project_from_api_key),
    db: Session = Depends(get_db),
):
    if not project.slack_bot_token:
        return {"error": "Slack isn't connected for this project yet — set it up on the Settings page."}
    items = slack.fetch_channel_history(req.channel_id, project.slack_bot_token)
    added = upsert_items(db, project.id, items)
    return {"channel_id": req.channel_id, "fetched": len(items), "newly_indexed": added}


@router.post("/ingest/jira")
def ingest_jira(
    req: IngestJiraRequest,
    project: Project = Depends(get_project_from_api_key),
    db: Session = Depends(get_db),
):
    project_key = req.project_key or project.jira_project_key
    if not project_key or not project.jira_api_token:
        return {"error": "Jira isn't connected for this project yet — set it up on the Settings page."}
    items = jira.fetch_issues(
        project_key, project.jira_base_url, project.jira_email, project.jira_api_token
    )
    added = upsert_items(db, project.id, items)
    return {"project_key": project_key, "fetched": len(items), "newly_indexed": added}


@router.post("/why-this", response_model=WhyThisResponse)
def why_this(
    req: WhyThisRequest,
    project: Project = Depends(get_project_from_api_key),
    db: Session = Depends(get_db),
):
    matches = similar_items(db, project.id, req.question)
    contexts = [item_to_context(m) for m in matches]
    answer = synthesize_answer(req.question, contexts)
    return WhyThisResponse(answer=answer, sources=contexts)


@router.post("/slack/commands")
async def slack_slash_command(request: Request, db: Session = Depends(get_db)):
    """Handles the /why-this Slack slash command. Each client connects their own Slack app,
    so the project (and its signing secret) is resolved from the workspace's team_id before
    the signature can even be checked."""
    raw_body = await request.body()
    form = {k: v[0] for k, v in parse_qs(raw_body.decode()).items()}
    team_id = form.get("team_id")

    project = db.query(Project).filter_by(slack_team_id=team_id).first() if team_id else None
    if project is None or not project.slack_signing_secret:
        raise HTTPException(401, "This Slack workspace isn't connected to a WhyThis project")

    verify_slack_signature(
        raw_body,
        request.headers.get("X-Slack-Request-Timestamp", ""),
        request.headers.get("X-Slack-Signature", ""),
        project.slack_signing_secret,
    )

    question = form.get("text", "").strip()
    if not question:
        return {"response_type": "ephemeral", "text": "Usage: `/why-this <your question>`"}

    matches = similar_items(db, project.id, question)
    contexts = [item_to_context(m) for m in matches]
    answer = synthesize_answer(question, contexts)
    return {"response_type": "in_channel", "text": answer}
