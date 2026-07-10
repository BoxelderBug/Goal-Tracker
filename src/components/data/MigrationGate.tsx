"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { runMigration, type MigrationStatus } from "@/lib/migration/runMigration";
import { Button } from "@/components/ui/Button";

/**
 * Runs the one-time blob → subcollection migration for the signed-in user
 * before rendering the app. Shows a blocking progress screen while migrating;
 * a returning user (already migrated) passes through after a quick marker check.
 */
export function MigrationGate({ uid, children }: { uid: string; children: ReactNode }) {
  const [status, setStatus] = useState<MigrationStatus>({ state: "checking" });
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (startedFor.current === uid) return;
    startedFor.current = uid;
    setStatus({ state: "checking" });
    runMigration(uid, setStatus).catch((error: unknown) => {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Migration failed.",
      });
    });
  }, [uid]);

  if (status.state === "ready") {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      {status.state === "error" ? (
        <>
          <h1 className="font-display text-xl text-danger">Upgrade failed</h1>
          <p className="max-w-md text-sm text-muted">{status.message}</p>
          <p className="max-w-md text-xs text-muted">
            Your original data is untouched. You can retry, or keep using the previous version.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              startedFor.current = null;
              setStatus({ state: "checking" });
              runMigration(uid, setStatus).catch((error: unknown) =>
                setStatus({
                  state: "error",
                  message: error instanceof Error ? error.message : "Migration failed.",
                }),
              );
            }}
          >
            Retry
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display text-xl text-accent-strong">Upgrading your data…</h1>
          <p className="text-sm text-muted">
            {status.state === "migrating" && status.total > 0
              ? `Moving ${status.done} of ${status.total} records`
              : "Getting things ready"}
          </p>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-[width]"
              style={{
                width:
                  status.state === "migrating" && status.total > 0
                    ? `${Math.round((status.done / status.total) * 100)}%`
                    : "15%",
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}
