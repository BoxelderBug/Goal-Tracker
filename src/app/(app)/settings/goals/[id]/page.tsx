"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { goalsRepo } from "@/lib/firebase/repos";
import { GoalForm } from "@/components/goals/GoalForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";

export default function EditGoalPage() {
  const { uid, goals, loading } = useUserData();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);

  const goal = goals.find((g) => g.id === params.id);

  async function save(next: Goal) {
    setSaving(true);
    try {
      await goalsRepo.set(uid, next);
      toast.success("Goal saved");
      router.push("/settings/goals");
    } catch {
      toast.error("Could not save goal");
      setSaving(false);
    }
  }

  if (loading) return <EmptyState>Loading…</EmptyState>;
  if (!goal) return <EmptyState>Goal not found.</EmptyState>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Edit goal</h1>
      <GoalForm initial={goal} onSave={save} onCancel={() => router.push("/settings/goals")} saving={saving} />
    </div>
  );
}
