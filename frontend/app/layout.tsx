import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Why This — Institutional Memory",
  description: "Ask why a piece of production code, decision, or process exists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
