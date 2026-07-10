"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Welcome{user?.email ? `, ${user.email}` : ""}</CardTitle>
        <p className="text-sm text-muted">
          This is the rebuilt Goal Tracker. Goals, entries, and dashboards land here in
          Phase 1.
        </p>
      </Card>
      <EmptyState>No goals yet — goal setup arrives in the next phase.</EmptyState>
    </div>
  );
}
