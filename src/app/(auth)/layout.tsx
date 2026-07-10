import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <h1 className="font-display text-2xl text-accent-strong">Goal Tracker</h1>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        {children}
      </div>
    </main>
  );
}
