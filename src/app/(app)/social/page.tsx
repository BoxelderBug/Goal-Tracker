"use client";

import { useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import type { Friend, Squad } from "@/types/models";
import { useUserData } from "@/components/data/UserDataProvider";
import { friendsRepo, squadsRepo } from "@/lib/firebase/repos";
import { moveToTrash } from "@/lib/firebase/actions/trash";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function SocialPage() {
  const { uid, goals } = useUserData();
  const confirm = useConfirm();
  const friends = useCollection<Friend>(() => friendsRepo.query(uid, orderBy("name", "asc")), [uid]);
  const squads = useCollection<Squad>(() => squadsRepo.query(uid, orderBy("createdAt", "desc")), [uid]);

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [sName, setSName] = useState("");
  const [sGoal, setSGoal] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  async function addFriend(event: FormEvent) {
    event.preventDefault();
    if (!fName.trim()) {
      toast.error("Enter a name");
      return;
    }
    try {
      await friendsRepo.set(uid, { id: createId(), name: fName.trim(), email: fEmail.trim(), createdAt: new Date().toISOString() });
      setFName(""); setFEmail("");
      toast.success("Friend added");
    } catch {
      toast.error("Could not add friend");
    }
  }

  async function removeFriend(friend: Friend) {
    const ok = await confirm({ message: `Remove ${friend.name}?`, confirmLabel: "Remove", danger: true });
    if (!ok) return;
    await moveToTrash(uid, "friend", friend, friend.name);
    toast.success("Moved to trash");
  }

  function toggleGoal(id: string) {
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function addSquad(event: FormEvent) {
    event.preventDefault();
    if (!sName.trim()) {
      toast.error("Enter a squad name");
      return;
    }
    try {
      await squadsRepo.set(uid, {
        id: createId(), name: sName.trim(), notes: "", weeklyGoal: Number(sGoal) || 0,
        memberEmails: [], goalIds: selectedGoals, createdAt: new Date().toISOString(),
      });
      setSName(""); setSGoal(""); setSelectedGoals([]);
      toast.success("Squad created");
    } catch {
      toast.error("Could not create squad");
    }
  }

  async function removeSquad(squad: Squad) {
    const ok = await confirm({ message: `Delete squad "${squad.name}"?`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await moveToTrash(uid, "squad", squad, squad.name);
    toast.success("Moved to trash");
  }

  const goalName = (id: string) => goals.find((g) => g.id === id)?.name ?? "goal";
  const activeGoals = goals.filter((g) => !g.archived);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Social</h1>
      <p className="text-sm text-muted">
        Keep track of friends and accountability squads. Live goal-sharing with cross-account updates is coming
        in a later update.
      </p>

      <Card className="flex flex-col gap-3">
        <CardTitle>Friends</CardTitle>
        <form onSubmit={addFriend} className="flex flex-wrap items-end gap-2">
          <Field label="Name" className="flex-1 min-w-[8rem]"><Input className="py-1" value={fName} onChange={(e) => setFName(e.target.value)} /></Field>
          <Field label="Email (optional)" className="flex-1 min-w-[8rem]"><Input type="email" className="py-1" value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></Field>
          <Button type="submit" variant="primary">Add</Button>
        </form>
        {friends.data.length === 0 ? (
          <p className="text-sm text-muted">No friends added yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {friends.data.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><span className="font-medium">{f.name}</span>{f.email ? <span className="text-muted"> · {f.email}</span> : null}</span>
                <Button size="sm" variant="ghost" onClick={() => removeFriend(f)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Squads</CardTitle>
        <form onSubmit={addSquad} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Squad name" className="flex-1 min-w-[8rem]"><Input className="py-1" value={sName} onChange={(e) => setSName(e.target.value)} /></Field>
            <Field label="Weekly goal" className="w-28"><Input type="number" min={0} className="py-1" value={sGoal} onChange={(e) => setSGoal(e.target.value)} /></Field>
          </div>
          {activeGoals.length > 0 ? (
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
              <legend className="mb-1 text-xs uppercase tracking-wide text-muted">Shared goals</legend>
              {activeGoals.map((g) => (
                <label key={g.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={selectedGoals.includes(g.id)} onChange={() => toggleGoal(g.id)} />
                  {g.name}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" variant="primary">Create squad</Button>
          </div>
        </form>
        {squads.data.length === 0 ? (
          <p className="text-sm text-muted">No squads yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {squads.data.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.weeklyGoal > 0 ? <Badge tone="accent">{s.weeklyGoal}/wk</Badge> : null}
                  </div>
                  {s.goalIds.length ? <div className="text-xs text-muted">{s.goalIds.map(goalName).join(", ")}</div> : null}
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeSquad(s)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
