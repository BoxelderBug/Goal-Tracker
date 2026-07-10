"use client";

import { useState, type FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import type { MilestoneStep, Settings } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { updateSettings } from "@/lib/firebase/repos/userDoc";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";

const TOGGLES: { key: keyof Settings; label: string }[] = [
  { key: "quartersEnabled", label: "Show quarter view" },
  { key: "bucketListEnabled", label: "Bucket list goals" },
  { key: "rewardPointsEnabled", label: "Reward points" },
  { key: "pointStoreRewardsEnabled", label: "Point store" },
  { key: "smartRemindersEnabled", label: "Smart reminders" },
  { key: "milestoneNotificationsEnabled", label: "Milestone notifications" },
  { key: "mobileQuickActionsEnabled", label: "Mobile quick actions" },
  { key: "onboardingEnabled", label: "Onboarding tips" },
];

export default function SettingsPage() {
  const { uid, settings } = useUserData();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);

  // Reset the draft when the saved settings reference changes (first load, or an
  // update from another device). React's adjust-state-during-render pattern —
  // `settings` identity is stable across unrelated data updates (see provider).
  const [syncedFrom, setSyncedFrom] = useState(settings);
  if (syncedFrom !== settings) {
    setSyncedFrom(settings);
    setDraft(settings);
  }

  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    setSaving(true);
    try {
      await updateSettings(uid, draft);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Settings</h1>

      <Card>
        <CardTitle>Preferences</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Week starts on">
            <Select value={draft.weekStart} onChange={(e) => set({ weekStart: e.target.value as Settings["weekStart"] })}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
          </Field>
          <Field label="Projection average">
            <Select
              value={draft.projectionAverageSource}
              onChange={(e) => set({ projectionAverageSource: e.target.value as Settings["projectionAverageSource"] })}
            >
              <option value="period">Current period</option>
              <option value="year">Year to date</option>
            </Select>
          </Field>
          <Field label="Missed-entry threshold (days)">
            <Input
              type="number" min={1} max={14}
              value={draft.missedEntryDays}
              onChange={(e) => set({ missedEntryDays: Math.max(1, Math.min(14, Number(e.target.value) || 1)) })}
            />
          </Field>
          <Field label="Milestone step">
            <Select
              value={String(draft.milestoneStep)}
              onChange={(e) => set({ milestoneStep: Number(e.target.value) as MilestoneStep })}
            >
              <option value="10">Every 10%</option>
              <option value="20">Every 20%</option>
              <option value="25">Every 25%</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Features</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOGGLES.map((toggle) => (
            <label key={toggle.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(draft[toggle.key])}
                onChange={(e) => set({ [toggle.key]: e.target.checked } as Partial<Settings>)}
              />
              {toggle.label}
            </label>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const user = getFirebaseAuth().currentUser;
    if (!user?.email) return;
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      toast.success("Password updated");
      setCurrent("");
      setNext("");
    } catch {
      toast.error("Could not update password — check your current password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Account security</CardTitle>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Updating…" : "Change password"}</Button>
        </div>
      </form>
    </Card>
  );
}
