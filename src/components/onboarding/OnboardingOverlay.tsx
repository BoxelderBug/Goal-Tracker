"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Settings, WeekStart } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { updateSettings } from "@/lib/firebase/repos/userDoc";
import { goalsRepo } from "@/lib/firebase/repos";
import { newGoal } from "@/lib/domain/newGoal";
import { shouldAutoShowOnboarding } from "@/lib/domain/onboarding";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";

const STEP_COUNT = 4;

const TOUR_LINKS: { href: string; label: string; blurb: string }[] = [
  { href: "/entry", label: "Log an entry", blurb: "Record progress toward a goal in seconds." },
  { href: "/week", label: "Week view", blurb: "See pace, projection, and how you're tracking." },
  { href: "/points", label: "Points & rewards", blurb: "Earn points when you hit goals, redeem for rewards." },
  { href: "/settings", label: "Settings", blurb: "Themes, features, and preferences — tune it later." },
];

/**
 * First-run welcome tour. Auto-opens for a fresh, empty account and can be
 * replayed from Settings via `?tour=1`. Finishing or dismissing writes
 * `onboardingCompleted` so it never re-appears on its own.
 */
export function OnboardingOverlay() {
  const { uid, settings, goals, loading } = useUserData();
  const router = useRouter();

  // null = not yet decided (waiting for data to load); false/true = resolved.
  const [open, setOpen] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);

  // Preferences drafted in step 1, seeded from saved settings.
  const [weekStart, setWeekStart] = useState<WeekStart>(settings.weekStart);
  const [rewardPoints, setRewardPoints] = useState(settings.rewardPointsEnabled);

  // First-goal draft (step 2).
  const [goalName, setGoalName] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState("");
  const [saving, setSaving] = useState(false);

  // Decide once, after the user's data has loaded (an unloaded account reads as
  // zero goals and would otherwise flash the tour at returning users). Resolving
  // during render — not in an effect — avoids a cascading re-render.
  if (open === null && !loading) {
    const replay =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tour") === "1";
    const show = replay || shouldAutoShowOnboarding(settings, goals.length);
    setOpen(show);
    if (show) {
      setWeekStart(settings.weekStart);
      setRewardPoints(settings.rewardPointsEnabled);
    }
  }

  async function persistAndClose() {
    // Persist chosen preferences alongside the completion marker in one write.
    try {
      await updateSettings(uid, {
        ...settings,
        weekStart,
        rewardPointsEnabled: rewardPoints,
        onboardingCompleted: true,
      } satisfies Settings);
    } catch {
      // Non-fatal: the tour still closes; settings can be set later.
    }
    setOpen(false);
    // Drop ?tour=1 (replay) and land on the dashboard.
    if (new URLSearchParams(window.location.search).get("tour") === "1") {
      router.replace("/");
    }
  }

  async function createFirstGoal(): Promise<boolean> {
    const name = goalName.trim();
    if (!name) {
      toast.error("Give your goal a name");
      return false;
    }
    setSaving(true);
    try {
      const goal = newGoal();
      goal.name = name;
      goal.unit = goalUnit.trim();
      goal.weeklyGoal = Math.max(0, Number(weeklyTarget) || 0);
      await goalsRepo.set(uid, goal);
      toast.success("Goal created");
      return true;
    } catch {
      toast.error("Could not create goal");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const isLast = step === STEP_COUNT - 1;

  return (
    <Modal open={open} onClose={persistAndClose} title={<span className="font-display">Welcome to Goal Tracker</span>}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 flex-1 rounded-full transition-colors " +
                (i <= step ? "bg-accent" : "bg-surface-2")
              }
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-medium">Track what matters, week by week.</h3>
            <p className="text-sm text-muted">
              Set goals with weekly, monthly, or yearly targets, log progress as you go, and watch
              your pace and projection update live. Let&apos;s get you set up in a few quick steps.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium">A couple of preferences</h3>
            <Field label="Week starts on">
              <Select value={weekStart} onChange={(e) => setWeekStart(e.target.value as WeekStart)}>
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rewardPoints}
                onChange={(e) => setRewardPoints(e.target.checked)}
              />
              Earn reward points when you hit goals
            </label>
            <p className="text-xs text-muted">You can change all of this later in Settings.</p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium">Create your first goal</h3>
            <Field label="Goal name">
              <Input
                autoFocus
                placeholder="e.g. Run"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Unit" hint="What you're counting">
                <Input placeholder="miles" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} />
              </Field>
              <Field label="Weekly target">
                <Input
                  type="number"
                  min={0}
                  placeholder="10"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Optional — you can skip this and add goals anytime from Settings.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-medium">You&apos;re all set</h3>
            <p className="text-sm text-muted">Here&apos;s where to go next:</p>
            <ul className="flex flex-col gap-2">
              {TOUR_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={persistAndClose}
                    className="flex flex-col rounded-xl border border-border bg-surface px-3 py-2 transition hover:bg-accent-soft"
                  >
                    <span className="text-sm font-medium text-text">{item.label}</span>
                    <span className="text-xs text-muted">{item.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={persistAndClose} disabled={saving}>
            {isLast ? "Close" : "Skip"}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button size="sm" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button variant="primary" size="sm" onClick={persistAndClose} disabled={saving}>
                Finish
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  if (step === 2 && (goalName.trim() || goalUnit.trim() || weeklyTarget.trim())) {
                    // User started a goal — create it before advancing.
                    const ok = await createFirstGoal();
                    if (!ok) return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                {saving ? "Saving…" : step === 2 ? "Create & continue" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
