"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, query, where } from "firebase/firestore";
import type { GoalShare, GoalShareStatus } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { useCollection } from "@/hooks/useCollection";
import { idConverter } from "@/lib/firebase/converters";
import { GOAL_SHARE_COLLECTION, PROFILE_COLLECTION, getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { buildGoalSummary } from "@/lib/domain/share";
import { formatAmount } from "@/lib/domain/format";
import {
  addPartnerEntry,
  invitePartner,
  pushGoalSummary,
  removeShare,
  respondToShare,
  type OwnerIdentity,
} from "@/lib/firebase/actions/shares";
import { getDateKey } from "@/lib/domain/dates";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

const STATUS_TONE: Record<GoalShareStatus, "behind" | "hit" | "missed" | "neutral"> = {
  pending: "behind",
  approved: "hit",
  rejected: "missed",
  removed: "neutral",
};

export default function PartnersPage() {
  const { uid, goals, entries } = useUserData();
  const settings = useSettings();
  const confirm = useConfirm();
  const now = useMemo(() => new Date(), []);

  const [owner, setOwner] = useState<OwnerIdentity>({ uid, email: "", username: "" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(getDb(), PROFILE_COLLECTION, uid));
      const data = snap.data() as { email?: string; username?: string } | undefined;
      const email = data?.email ?? getFirebaseAuth().currentUser?.email ?? "";
      if (!cancelled) setOwner({ uid, email, username: data?.username ?? "" });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const outgoing = useCollection<GoalShare>(
    () =>
      query(
        collection(getDb(), GOAL_SHARE_COLLECTION).withConverter(idConverter<GoalShare>()),
        where("ownerUid", "==", uid),
      ),
    [uid],
  );
  const incoming = useCollection<GoalShare>(
    () =>
      query(
        collection(getDb(), GOAL_SHARE_COLLECTION).withConverter(idConverter<GoalShare>()),
        where("partnerUid", "==", uid),
      ),
    [uid],
  );

  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const [goalId, setGoalId] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function invite() {
    const goal = activeGoals.find((g) => g.id === goalId);
    if (!goal) {
      toast.error("Pick a goal to share");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your partner's email");
      return;
    }
    setInviting(true);
    try {
      await invitePartner(owner, goal, email);
      toast.success("Invite sent");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setInviting(false);
    }
  }

  async function pushUpdate(share: GoalShare) {
    const goal = goals.find((g) => g.id === share.ownerGoalId);
    if (!goal) {
      toast.error("That goal no longer exists");
      return;
    }
    setBusyId(share.id);
    try {
      await pushGoalSummary(share, buildGoalSummary(goal, entries, settings.weekStart, now));
      toast.success("Progress shared");
    } catch {
      toast.error("Could not share progress");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(share: GoalShare) {
    const ok = await confirm({
      message: `Stop sharing "${share.goalName}" with ${share.partnerEmail}?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusyId(share.id);
    try {
      await removeShare(share);
    } catch {
      toast.error("Could not remove share");
    } finally {
      setBusyId(null);
    }
  }

  async function respond(share: GoalShare, accept: boolean) {
    setBusyId(share.id);
    try {
      await respondToShare(share, accept);
      toast.success(accept ? "Invite accepted" : "Invite declined");
    } catch {
      toast.error("Could not update invite");
    } finally {
      setBusyId(null);
    }
  }

  const pendingIncoming = incoming.data.filter((s) => s.status === "pending");
  const approvedIncoming = incoming.data.filter((s) => s.status === "approved");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">Accountability partners</h1>
        <p className="text-sm text-muted">Share a goal&apos;s weekly progress with someone who keeps you honest.</p>
      </div>

      <Card>
        <CardTitle>Share a goal</CardTitle>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Goal">
            <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">Select a goal…</option>
              {activeGoals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Partner's email">
            <Input
              type="email"
              placeholder="partner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button variant="primary" onClick={invite} disabled={inviting}>
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">They need a Goal Tracker account with that email.</p>
      </Card>

      {pendingIncoming.length > 0 ? (
        <Card>
          <CardTitle>Invites for you</CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {pendingIncoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-sm">
                  <span className="font-medium">{s.ownerUsername || s.ownerEmail}</span> wants to share{" "}
                  <span className="font-medium">{s.goalName}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="primary" disabled={busyId === s.id} onClick={() => respond(s, true)}>Accept</Button>
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => respond(s, false)}>Decline</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Following</CardTitle>
        {approvedIncoming.length === 0 ? (
          <EmptyState>No shared goals yet. Accept an invite to follow someone&apos;s progress.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {approvedIncoming.map((s) => {
              const g = s.goalSummary;
              const pct = g && g.target > 0 ? Math.round((g.progress / g.target) * 100) : null;
              return (
                <li key={s.id} className="rounded-xl border border-border bg-surface px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{s.goalName}</span>
                    <span className="text-xs text-muted">{s.ownerUsername || s.ownerEmail}</span>
                  </div>
                  {g ? (
                    <div className="mt-1 text-xs text-muted">
                      {formatAmount(g.progress)}{g.target > 0 ? ` / ${formatAmount(g.target)}` : ""} {s.goalUnit}
                      {pct !== null ? ` · ${pct}%` : ""} this week
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted">Waiting for their first progress update.</div>
                  )}
                  <PartnerLogForm share={s} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <SharingCard outgoing={outgoing.data} busyId={busyId} onPush={pushUpdate} onRemove={remove} />
    </div>
  );
}

function PartnerLogForm({ share }: { share: GoalShare }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  async function log() {
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter an amount above 0");
      return;
    }
    setBusy(true);
    try {
      await addPartnerEntry(share, { amount: value, date: getDateKey(new Date()), notes: "Logged by partner" });
      toast.success("Progress logged");
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log progress");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        type="number" min={0} step="any" inputMode="decimal"
        placeholder={`Add ${share.goalUnit || "progress"}`}
        className="w-32 py-1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") log(); }}
        aria-label={`Log progress for ${share.goalName}`}
      />
      <Button size="sm" disabled={busy} onClick={log}>{busy ? "Logging…" : "Log"}</Button>
    </div>
  );
}

function SharingCard({
  outgoing,
  busyId,
  onPush,
  onRemove,
}: {
  outgoing: GoalShare[];
  busyId: string | null;
  onPush: (s: GoalShare) => void;
  onRemove: (s: GoalShare) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Goals you&apos;re sharing</CardTitle>
        {outgoing.length === 0 ? (
          <EmptyState>You haven&apos;t shared any goals yet.</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {outgoing.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{s.goalName}</span>
                  <span className="text-xs text-muted">{s.partnerName || s.partnerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                  {s.status === "approved" ? (
                    <Button size="sm" disabled={busyId === s.id} onClick={() => onPush(s)}>Push update</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => onRemove(s)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
