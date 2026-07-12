import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7 text-accent" />
      <span className="font-display text-sm text-muted">{label}</span>
    </main>
  );
}
