"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  askWhyThis,
  getApiKey,
  getProjectConfig,
  ingestGithub,
  ingestJira,
  ingestSlack,
  type ProjectConfig,
  type Source,
} from "@/lib/api";
import SourceCard from "@/components/SourceCard";
import ConnectedBadge from "@/components/ConnectedBadge";

const EXAMPLES = [
  "Why does calculateTax() work this way?",
  "Why did we switch payment providers?",
  "Why is retry logic disabled for the export job?",
];

export default function Home() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [config, setConfig] = useState<ProjectConfig | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    const key = getApiKey();
    setHasKey(!!key);
    if (key) getProjectConfig().then(setConfig).catch(() => {});
  }, []);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await askWhyThis(question);
      setAnswer(res.answer);
      setSources(res.sources);
    } catch {
      setError("Couldn't reach the API. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function sync(kind: "github" | "slack" | "jira") {
    setSyncStatus(`Syncing ${kind}...`);
    try {
      const result =
        kind === "github" ? await ingestGithub() : kind === "jira" ? await ingestJira() : await ingestSlack(channel);
      setSyncStatus(JSON.stringify(result));
    } catch {
      setSyncStatus(`Failed to sync ${kind}.`);
    }
  }

  if (hasKey === false) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Why<span className="text-indigo-400">This</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Institutional memory for engineering teams — ask why a piece of code, a process, or a
          decision exists, and get a sourced answer instead of a guess.
        </p>
        <Link
          href="/settings"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium hover:bg-indigo-500"
        >
          Set up your first project →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Why<span className="text-indigo-400">This</span>
      </h1>
      <p className="mt-1 text-slate-400">
        Ask why a piece of production code, a process, or a decision exists.
      </p>

      <form onSubmit={handleAsk} className="mt-8 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={EXAMPLES[0]}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuestion(ex)}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {answer && (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 p-4 whitespace-pre-wrap">
          {answer}
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-4 space-y-2">
          {sources.map((s, i) => (
            <SourceCard key={`${s.source_type}-${s.source_id}`} source={s} index={i + 1} />
          ))}
        </div>
      )}

      <details className="mt-14 rounded-lg border border-slate-800 p-4" open={!answer}>
        <summary className="cursor-pointer text-slate-300">Data sources</summary>
        <div className="mt-4 space-y-3">
          {!config && (
            <p className="text-sm text-slate-400">
              Loading project config... if this doesn't resolve,{" "}
              <Link href="/settings" className="text-indigo-400 hover:underline">
                check your API key
              </Link>
              .
            </p>
          )}
          {config && (
            <>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-sm">GitHub {config.github_repo && `(${config.github_repo})`}</span>
                <div className="flex items-center gap-2">
                  <ConnectedBadge connected={config.github_connected} />
                  <button
                    onClick={() => sync("github")}
                    disabled={!config.github_connected}
                    className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-40"
                  >
                    Sync
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-sm">Jira {config.jira_project_key && `(${config.jira_project_key})`}</span>
                <div className="flex items-center gap-2">
                  <ConnectedBadge connected={config.jira_connected} />
                  <button
                    onClick={() => sync("jira")}
                    disabled={!config.jira_connected}
                    className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-40"
                  >
                    Sync
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2">
                <span className="text-sm shrink-0">Slack</span>
                <ConnectedBadge connected={config.slack_connected} />
                <input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="Channel ID"
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                />
                <button
                  onClick={() => sync("slack")}
                  disabled={!config.slack_connected || !channel}
                  className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-40"
                >
                  Sync
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Connect or update credentials on the{" "}
                <Link href="/settings" className="text-indigo-400 hover:underline">
                  Settings
                </Link>{" "}
                page.
              </p>
            </>
          )}
          {syncStatus && (
            <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
              {syncStatus}
            </pre>
          )}
        </div>
      </details>
    </main>
  );
}
