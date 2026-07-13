import type { Settings } from "@/types/models";

/**
 * Whether to auto-open the first-run welcome tour.
 *
 * Only fires for a genuinely fresh account: the tour is enabled, has never been
 * finished/dismissed, and no goals exist yet. Gating on an empty goal list keeps
 * existing users (who always have goals) from ever seeing it re-appear, even
 * before `onboardingCompleted` has been written to their doc.
 *
 * Manual replay from Settings bypasses this and opens the tour directly.
 */
export function shouldAutoShowOnboarding(settings: Settings, goalsCount: number): boolean {
  return settings.onboardingEnabled && !settings.onboardingCompleted && goalsCount === 0;
}
