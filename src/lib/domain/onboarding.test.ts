import { describe, expect, it } from "vitest";
import type { Settings } from "@/types/models";
import { normalizeSettings } from "@/lib/migration/normalize";
import { shouldAutoShowOnboarding } from "./onboarding";

const settings = (over: Partial<Settings>): Settings => ({ ...normalizeSettings({}), ...over });

describe("shouldAutoShowOnboarding", () => {
  it("shows for a fresh account (enabled, not completed, no goals)", () => {
    expect(shouldAutoShowOnboarding(settings({ onboardingCompleted: false }), 0)).toBe(true);
  });

  it("does not show once any goal exists", () => {
    expect(shouldAutoShowOnboarding(settings({ onboardingCompleted: false }), 1)).toBe(false);
  });

  it("does not show after it has been completed or dismissed", () => {
    expect(shouldAutoShowOnboarding(settings({ onboardingCompleted: true }), 0)).toBe(false);
  });

  it("does not show when onboarding is disabled entirely", () => {
    expect(shouldAutoShowOnboarding(settings({ onboardingEnabled: false }), 0)).toBe(false);
  });

  it("defaults (new normalized settings) show for an empty account", () => {
    expect(shouldAutoShowOnboarding(normalizeSettings({}), 0)).toBe(true);
  });
});
