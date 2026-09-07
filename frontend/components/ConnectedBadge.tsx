export default function ConnectedBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        connected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300"
      }`}
    >
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
