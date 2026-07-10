import { cn } from "@/lib/cn";

type Tone = "hit" | "onpace" | "behind" | "missed";

const fillClass: Record<Tone, string> = {
  hit: "bg-tone-hit",
  onpace: "bg-tone-onpace",
  behind: "bg-tone-behind",
  missed: "bg-tone-missed",
};

export function ProgressBar({
  percent,
  tone,
  className,
}: {
  percent: number;
  tone: Tone;
  className?: string;
}) {
  const width = Math.max(0, Math.min(percent, 100));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full transition-[width]", fillClass[tone])} style={{ width: `${width}%` }} />
    </div>
  );
}
