"use client";

import { ChallengeManager } from "@/components/challenges/ChallengeManager";

export default function ChallengesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">Challenges</h1>
        <p className="text-sm text-muted">
          A time-boxed push on one goal: hit an amount by a date. Entries you log for that goal
          fill the bar.
        </p>
      </div>
      <ChallengeManager />
    </div>
  );
}
