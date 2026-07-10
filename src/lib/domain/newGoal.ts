import type { Goal } from "@/types/models";
import { createId } from "@/lib/id";

/** A blank goal with legacy default point values, ready for the setup form. */
export function newGoal(): Goal {
  return {
    id: createId(),
    name: "",
    goalType: "quantity",
    archived: false,
    priority: 0,
    tags: [],
    unit: "",
    progressMetrics: [],
    weeklyGoal: 0,
    monthlyGoal: 0,
    yearlyGoal: 0,
    goalsPlus: { mode: "standard" },
    customWeeklyEnabled: false,
    customWeeklyTargets: [],
    customMonthlyEnabled: false,
    customMonthlyTargets: [],
    goalPointsWeekly: 1,
    goalPointsMonthly: 3,
    goalPointsYearly: 10,
    termDeadline: "",
    termTarget: 0,
    termCarryover: false,
    termToYear: false,
    ioConfig: null,
    accountabilityPartnerEmail: "",
    accountabilityPartnerName: "",
    accountabilityPartnerId: "",
    accountabilityShareId: "",
    accountabilityStatus: "none",
    headwinds: [],
    tailwinds: [],
    createdAt: new Date().toISOString(),
  };
}
