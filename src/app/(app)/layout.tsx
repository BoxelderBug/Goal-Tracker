"use client";

import { useEffect, type ReactNode } from "react";
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

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  return (
    <ConfirmProvider>
      <MigrationGate uid={user.uid}>
        <UserDataProvider uid={user.uid}>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft">
              <span className="font-display text-lg text-accent-strong">Goal Tracker</span>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeControls />
                <Button size="sm" onClick={() => signOut(getFirebaseAuth())}>
                  Logout
                </Button>
              </div>
            </header>
            <AppNav />
            <main className="flex-1">{children}</main>
          </div>
        </UserDataProvider>
      </MigrationGate>
      <Toaster />
    </ConfirmProvider>
  );
}
