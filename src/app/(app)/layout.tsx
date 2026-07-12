"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Toaster } from "@/components/ui/Toaster";
import { Button } from "@/components/ui/Button";
import { ThemeControls } from "@/components/layout/ThemeControls";
import { MigrationGate } from "@/components/data/MigrationGate";
import { UserDataProvider } from "@/components/data/UserDataProvider";
import { AppNav } from "@/components/layout/AppNav";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { LoadingScreen } from "@/components/ui/Spinner";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <ConfirmProvider>
      <MigrationGate uid={user.uid}>
        <UserDataProvider uid={user.uid}>
          <KeyboardShortcuts onEscape={() => setNavOpen(false)} />
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNavOpen(true)}
                  aria-label="Open menu"
                  className="rounded-lg p-1.5 text-text hover:bg-accent-soft md:hidden"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <span className="font-display text-lg text-accent-strong">Goal Tracker</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <NotificationsBell />
                <ThemeControls />
                <Button size="sm" onClick={() => signOut(getFirebaseAuth())}>
                  Logout
                </Button>
              </div>
            </header>
            <div className="flex flex-1 gap-6">
              <AppNav open={navOpen} onClose={() => setNavOpen(false)} />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted">
              <span>Goal Tracker</span>
              <Link href="/legal" className="hover:text-text">Privacy &amp; terms</Link>
            </footer>
          </div>
        </UserDataProvider>
      </MigrationGate>
      <Toaster />
    </ConfirmProvider>
  );
}
