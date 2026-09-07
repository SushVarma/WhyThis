"use client";

import { useEffect, useState } from "react";
import {
  createProject,
  getApiKey,
  getProjectConfig,
  setApiKey,
  updateIntegrations,
  type ProjectConfig,
} from "@/lib/api";
import ConnectedBadge from "@/components/ConnectedBadge";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingWhich, setSavingWhich] = useState<string | null>(null);

  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [slackBotToken, setSlackBotToken] = useState("");
  const [slackSigningSecret, setSlackSigningSecret] = useState("");
  const [slackTeamId, setSlackTeamId] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");

  function loadConfig() {
    if (!getApiKey()) return;
    getProjectConfig()
      .then((c) => {
        setConfig(c);
        setGithubRepo(c.github_repo || "");
        setJiraProjectKey(c.jira_project_key || "");
      })
      .catch(() => setError("Couldn't load project config. Check the API key below."));
  }

  useEffect(() => {
    setCurrentKey(getApiKey());
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const project = await createProject(orgName, projectName);
      setCreatedKey(project.api_key);
      setApiKey(project.api_key);
      setCurrentKey(project.api_key);
      loadConfig();
    } catch {
      setError("Couldn't create project. Is the backend running?");
    }
  }

  function handleSaveManualKey() {
    setApiKey(manualKey);
    setCurrentKey(manualKey);
    loadConfig();
  }

  async function saveGithub() {
    setSavingWhich("github");
    try {
      const c = await updateIntegrations({ github_token: githubToken, github_repo: githubRepo });
      setConfig(c);
      setGithubToken("");
    } catch {
      setError("Couldn't save GitHub settings.");
    } finally {
      setSavingWhich(null);
    }
  }

  async function saveSlack() {
    setSavingWhich("slack");
    try {
      const c = await updateIntegrations({
        slack_bot_token: slackBotToken,
        slack_signing_secret: slackSigningSecret,
        slack_team_id: slackTeamId,
      });
      setConfig(c);
      setSlackBotToken("");
      setSlackSigningSecret("");
    } catch {
      setError("Couldn't save Slack settings.");
    } finally {
      setSavingWhich(null);
    }
  }

  async function saveJira() {
    setSavingWhich("jira");
    try {
      const c = await updateIntegrations({
        jira_base_url: jiraBaseUrl,
        jira_email: jiraEmail,
        jira_api_token: jiraApiToken,
        jira_project_key: jiraProjectKey,
      });
      setConfig(c);
      setJiraApiToken("");
    } catch {
      setError("Couldn't save Jira settings.");
    } finally {
      setSavingWhich(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">
        Each client gets an isolated project — its own API key and its own GitHub/Slack/Jira
        connections. Nothing here is shared across clients.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-slate-400">Current API key (this browser)</h2>
        <p className="mt-1 break-all rounded bg-slate-900 p-2 font-mono text-sm">
          {currentKey || "none set"}
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 p-4">
        <h2 className="font-medium">Create a new client project</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Client's company name"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            required
          />
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name (e.g. their main repo)"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Create project
          </button>
        </form>
        {createdKey && (
          <p className="mt-3 text-sm text-emerald-400">
            Project created and its API key saved to this browser. Hand this key to the client
            (or keep this browser as their dashboard) — it scopes everything below to them alone.
          </p>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 p-4">
        <h2 className="font-medium">Use an existing project's API key</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="wt_..."
            className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={handleSaveManualKey}
            className="rounded bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Save
          </button>
        </div>
      </section>

      {config && (
        <>
          <section className="mt-8 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">GitHub</h2>
              <ConnectedBadge connected={config.github_connected} />
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="owner/repo"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={config.github_connected ? "Token saved — enter a new one to replace it" : "GitHub personal access token"}
                type="password"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                onClick={saveGithub}
                disabled={savingWhich === "github"}
                className="rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {savingWhich === "github" ? "Saving..." : "Save GitHub"}
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Slack</h2>
              <ConnectedBadge connected={config.slack_connected} />
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={slackBotToken}
                onChange={(e) => setSlackBotToken(e.target.value)}
                placeholder={config.slack_connected ? "Bot token saved — enter a new one to replace it" : "Bot token (xoxb-...)"}
                type="password"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={slackSigningSecret}
                onChange={(e) => setSlackSigningSecret(e.target.value)}
                placeholder="Signing secret"
                type="password"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={slackTeamId}
                onChange={(e) => setSlackTeamId(e.target.value)}
                placeholder="Workspace/team ID (for the /why-this slash command)"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                onClick={saveSlack}
                disabled={savingWhich === "slack"}
                className="rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {savingWhich === "slack" ? "Saving..." : "Save Slack"}
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Jira</h2>
              <ConnectedBadge connected={config.jira_connected} />
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://client.atlassian.net"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="Account email"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={jiraApiToken}
                onChange={(e) => setJiraApiToken(e.target.value)}
                placeholder={config.jira_connected ? "API token saved — enter a new one to replace it" : "API token"}
                type="password"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={jiraProjectKey}
                onChange={(e) => setJiraProjectKey(e.target.value)}
                placeholder="Project key"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                onClick={saveJira}
                disabled={savingWhich === "jira"}
                className="rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {savingWhich === "jira" ? "Saving..." : "Save Jira"}
              </button>
            </div>
          </section>
        </>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}
    </main>
  );
}
