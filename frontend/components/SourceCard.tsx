import type { Source } from "@/lib/api";

const LABELS: Record<string, string> = {
  github_commit: "Commit",
  github_pr: "Pull Request",
  slack: "Slack",
  jira: "Jira",
};

export default function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono">[{index}]</span>
        <span className="font-medium text-slate-300">
          {LABELS[source.source_type] || source.source_type}
        </span>
        {source.author && <span>· {source.author}</span>}
        {source.occurred_at && (
          <span>· {new Date(source.occurred_at).toLocaleDateString()}</span>
        )}
      </div>
      <div className="mt-1 line-clamp-3 text-slate-200">{source.title || source.content}</div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-indigo-400 hover:underline"
        >
          Open source →
        </a>
      )}
    </div>
  );
}
