"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import type { PointTransaction, Reward, RewardPurchase } from "@/types/models";
import { useSettings, useUserData } from "@/components/data/UserDataProvider";
import { pointTransactionsRepo, rewardPurchasesRepo, rewardsRepo } from "@/lib/firebase/repos";
import { newPointTransaction, pointsBalance } from "@/lib/domain/points";
import { formatAmount } from "@/lib/domain/format";
import { useCollection } from "@/hooks/useCollection";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toaster";

export default function PointsPage() {
  const { uid } = useUserData();
  const settings = useSettings();
  const router = useRouter();
  const confirm = useConfirm();

  useEffect(() => {
    if (!settings.rewardPointsEnabled) router.replace("/settings");
  }, [settings.rewardPointsEnabled, router]);

  const rewards = useCollection<Reward>(() => rewardsRepo.query(uid, orderBy("cost", "asc")), [uid]);
  const purchases = useCollection<RewardPurchase>(() => rewardPurchasesRepo.query(uid, orderBy("purchasedAt", "desc")), [uid]);
  const transactions = useCollection<PointTransaction>(() => pointTransactionsRepo.query(uid, orderBy("createdAt", "desc")), [uid]);

  const balance = useMemo(() => pointsBalance(transactions.data), [transactions.data]);

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  if (!settings.rewardPointsEnabled) return null;

  async function addReward(event: FormEvent) {
    event.preventDefault();
    const c = Number(cost);
    if (!name.trim() || !(c > 0)) {
      toast.error("Enter a name and cost");
      return;
    }
    try {
      await rewardsRepo.set(uid, { id: createId(), name: name.trim(), cost: c, notes: notes.trim(), createdAt: new Date().toISOString() });
      setName(""); setCost(""); setNotes("");
      toast.success("Reward added");
    } catch {
      toast.error("Could not add reward");
    }
  }

  async function deleteReward(reward: Reward) {
    const ok = await confirm({ message: `Delete reward "${reward.name}"?`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    await rewardsRepo.remove(uid, reward.id);
    toast.success("Reward deleted");
  }

  async function redeem(reward: Reward) {
    if (balance < reward.cost) {
      toast.error("Not enough points");
      return;
    }
    const ok = await confirm({ message: `Redeem "${reward.name}" for ${reward.cost} points?`, confirmLabel: "Redeem" });
    if (!ok) return;
    try {
      const purchase: RewardPurchase = {
        id: createId(), rewardId: reward.id, rewardName: reward.name, cost: reward.cost,
        notes: reward.notes, status: "active", purchasedAt: new Date().toISOString(), closedAt: null, refundedAt: null,
      };
      await rewardPurchasesRepo.set(uid, purchase);
      await pointTransactionsRepo.set(uid, newPointTransaction({ type: "spend-reward", amount: -reward.cost, note: `Redeemed ${reward.name}`, rewardId: reward.id }));
      toast.success(`Redeemed ${reward.name}`);
    } catch {
      toast.error("Could not redeem");
    }
  }

  async function refund(purchase: RewardPurchase) {
    const ok = await confirm({ message: `Refund "${purchase.rewardName}" for ${purchase.cost} points?`, confirmLabel: "Refund" });
    if (!ok) return;
    try {
      await rewardPurchasesRepo.set(uid, { ...purchase, status: "refunded", refundedAt: new Date().toISOString() });
      await pointTransactionsRepo.set(uid, newPointTransaction({ type: "refund-reward", amount: purchase.cost, note: `Refunded ${purchase.rewardName}`, rewardId: purchase.rewardId }));
      toast.success("Refunded");
    } catch {
      toast.error("Could not refund");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Points</h1>
        <Card className="px-4 py-2">
          <span className="text-xs uppercase tracking-wide text-muted">Balance</span>
          <div className="font-display text-2xl">{formatAmount(balance)}</div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle>Rewards</CardTitle>
        <form onSubmit={addReward} className="flex flex-wrap items-end gap-2">
          <Field label="Reward" className="flex-1 min-w-[10rem]"><Input className="py-1" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Cost" className="w-24"><Input type="number" min={0} step={1} className="py-1" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          <Field label="Notes" className="flex-1 min-w-[8rem]"><Input className="py-1" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Button type="submit" variant="primary">Add</Button>
        </form>
        {rewards.data.length === 0 ? (
          <p className="text-sm text-muted">No rewards yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rewards.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="text-sm text-muted">{r.cost} pts{r.notes ? ` · ${r.notes}` : ""}</span>
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="primary" disabled={balance < r.cost} onClick={() => redeem(r)}>Redeem</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteReward(r)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <CardTitle>Purchases</CardTitle>
          {purchases.data.length === 0 ? (
            <p className="text-sm text-muted">No purchases yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {purchases.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{p.rewardName}</span>{" "}
                    <span className="text-muted">{p.cost} pts · {p.purchasedAt.slice(0, 10)}</span>
                  </span>
                  {p.status === "refunded" ? (
                    <Badge tone="neutral">Refunded</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => refund(p)}>Refund</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <CardTitle>History</CardTitle>
          {transactions.data.length === 0 ? (
            <p className="text-sm text-muted">No point activity yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {transactions.data.slice(0, 30).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-muted">{t.note || t.type}</span>
                  <span className={t.amount >= 0 ? "text-tone-hit" : "text-tone-missed"}>
                    {t.amount >= 0 ? "+" : ""}{formatAmount(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
