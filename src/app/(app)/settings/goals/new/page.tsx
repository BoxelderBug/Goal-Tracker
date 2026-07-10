"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { goalsRepo } from "@/lib/firebase/repos";
import { GoalForm } from "@/components/goals/GoalForm";
import { newGoal } from "@/lib/domain/newGoal";
import { toast } from "@/components/ui/Toaster";

export default function NewGoalPage() {
  const { uid } = useUserData();
  const router = useRouter();
  const initial = useMemo(() => newGoal(), []);
  const [saving, setSaving] = useState(false);

  async function save(goal: Goal) {
    setSaving(true);
    try {
      await goalsRepo.set(uid, goal);
      toast.success("Goal created");
      router.push("/settings/goals");
    } catch {
      toast.error("Could not save goal");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">New goal</h1>
      <GoalForm initial={initial} onSave={save} onCancel={() => router.push("/settings/goals")} saving={saving} />
    </div>
  );
}
