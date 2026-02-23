export function normalizeProjectionAverageSource(value) {
  return value === "year" ? "year" : "period";
}

export function normalizeGoalPoints(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 1), 0);
  }
  return Math.max(Math.floor(numeric), 0);
}

export function normalizeGoalPriority(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 0), 0);
  }
  return Math.max(Math.min(Math.floor(numeric), 1000), 0);
}

export function compareTrackersByPriority(a, b) {
  const priorityA = normalizeGoalPriority(a && a.priority, 0);
  const priorityB = normalizeGoalPriority(b && b.priority, 0);
  if (priorityA !== priorityB) {
    return priorityB - priorityA;
  }
  const nameA = String((a && a.name) || "");
  const nameB = String((b && b.name) || "");
  return nameA.localeCompare(nameB);
}

export function normalizeThemeKey(value) {
  const allowed = new Set(["teal", "ocean", "forest", "sunset", "amber", "berry", "slate", "midnight"]);
  const key = String(value || "").toLowerCase().trim();
  if (allowed.has(key)) {
    return key;
  }
  return "teal";
}

export function normalizeDefaultGoalType(value) {
  const key = String(value || "").toLowerCase().trim();
  if (key === "yesno" || key === "floating" || key === "bucket") {
    return key;
  }
  return "quantity";
}

export function getDefaultSettings() {
  return {
    weekStart: "monday",
    compareToLastDefault: true,
    projectionAverageSource: "period",
    rewardPointsEnabled: false,
    goalHitNotificationsEnabled: true,
    bucketListEnabled: true,
    theme: "teal",
    compactMode: false,
    onboardingComplete: false,
    defaultGoalType: "quantity",
    defaultGoalTags: []
  };
}
