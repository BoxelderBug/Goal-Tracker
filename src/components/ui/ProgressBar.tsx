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
  projectedPercent,
  className,
}: {
  percent: number;
  tone: Tone;
  /** projected end-of-period completion %; draws a translucent bar past the current fill */
  projectedPercent?: number;
  className?: string;
}) {
  const width = Math.max(0, Math.min(percent, 100));
  const projectedWidth =
    projectedPercent === undefined ? 0 : Math.max(width, Math.min(projectedPercent, 100));
  const showProjected = projectedWidth > width + 0.5;

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {showProjected ? (
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full opacity-30 transition-[width]", fillClass[tone])}
          style={{ width: `${projectedWidth}%` }}
          aria-hidden
          title={`Projected ${Math.round(projectedWidth)}%`}
        />
      ) : null}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width]", fillClass[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
