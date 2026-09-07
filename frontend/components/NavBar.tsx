import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="font-semibold tracking-tight">
        Why<span className="text-indigo-400">This</span>
      </Link>
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
        Ask
      </Link>
      <Link href="/settings" className="text-sm text-slate-400 hover:text-slate-200">
        Settings
      </Link>
    </nav>
  );
}
