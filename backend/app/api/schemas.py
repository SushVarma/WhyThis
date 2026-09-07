from pydantic import BaseModel


class WhyThisRequest(BaseModel):
    question: str


class WhyThisResponse(BaseModel):
    answer: str
    sources: list[dict]


class IngestGithubRequest(BaseModel):
    repo: str | None = None  # defaults to the project's stored github_repo


class IngestSlackRequest(BaseModel):
    channel_id: str


class IngestJiraRequest(BaseModel):
    project_key: str | None = None  # defaults to the project's stored jira_project_key


class CreateProjectRequest(BaseModel):
    org_name: str
    project_name: str


class ProjectOut(BaseModel):
    id: int
    name: str
    api_key: str

    class Config:
        from_attributes = True


class ProjectIntegrationsUpdate(BaseModel):
    github_token: str | None = None
    github_repo: str | None = None
    slack_bot_token: str | None = None
    slack_signing_secret: str | None = None
    slack_team_id: str | None = None
    jira_base_url: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None
    jira_project_key: str | None = None


class ProjectConfigOut(BaseModel):
    id: int
    name: str
    github_repo: str | None = None
    github_connected: bool
    slack_connected: bool
    jira_connected: bool
    jira_project_key: str | None = None
