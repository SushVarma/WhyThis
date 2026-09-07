const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const API_KEY_STORAGE = "whythis_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

async function authedFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export type Source = {
  source_type: string;
  source_id: string;
  title: string | null;
  content: string;
  url: string | null;
  author: string | null;
  occurred_at: string | null;
};

export type WhyThisResponse = {
  answer: string;
  sources: Source[];
};

export type ProjectConfig = {
  id: number;
  name: string;
  github_repo: string | null;
  github_connected: boolean;
  slack_connected: boolean;
  jira_connected: boolean;
  jira_project_key: string | null;
};

export type IntegrationsUpdate = {
  github_token?: string;
  github_repo?: string;
  slack_bot_token?: string;
  slack_signing_secret?: string;
  slack_team_id?: string;
  jira_base_url?: string;
  jira_email?: string;
  jira_api_token?: string;
  jira_project_key?: string;
};

export function askWhyThis(question: string): Promise<WhyThisResponse> {
  return authedFetch("/why-this", { method: "POST", body: JSON.stringify({ question }) });
}

export function ingestGithub(repo?: string) {
  return authedFetch("/ingest/github", { method: "POST", body: JSON.stringify({ repo }) });
}

export function ingestSlack(channel_id: string) {
  return authedFetch("/ingest/slack", { method: "POST", body: JSON.stringify({ channel_id }) });
}

export function ingestJira(project_key?: string) {
  return authedFetch("/ingest/jira", { method: "POST", body: JSON.stringify({ project_key }) });
}

export function getProjectConfig(): Promise<ProjectConfig> {
  return authedFetch("/projects/me");
}

export function updateIntegrations(update: IntegrationsUpdate): Promise<ProjectConfig> {
  return authedFetch("/projects/me/integrations", {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function createProject(orgName: string, projectName: string) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_name: orgName, project_name: projectName }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<{ id: number; name: string; api_key: string }>;
}
