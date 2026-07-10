export const THEMES = [
  "teal",
  "ocean",
  "forest",
  "sunset",
  "amber",
  "berry",
  "slate",
  "midnight",
] as const;

export type Theme = (typeof THEMES)[number];

export const MODES = ["light", "dark", "system"] as const;
export type Mode = (typeof MODES)[number];

export const THEME_STORAGE_KEY = "gt-theme";
export const MODE_STORAGE_KEY = "gt-mode";

export const DEFAULT_THEME: Theme = "teal";
export const DEFAULT_MODE: Mode = "system";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

export function resolveMode(mode: Mode, systemPrefersDark: boolean): "light" | "dark" {
  if (mode === "system") return systemPrefersDark ? "dark" : "light";
  return mode;
}

/**
 * Runs before hydration via an inline <script> in the root layout so the first
 * paint already has the right data-theme/data-mode — no flash.
 */
export const THEME_NO_FLASH_SCRIPT = `(function () {
  try {
    var themes = ${JSON.stringify(THEMES)};
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var m = localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});
    var root = document.documentElement;
    root.dataset.theme = themes.indexOf(t) >= 0 ? t : "teal";
    var dark = m === "dark" || ((m === null || m === "system") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.mode = dark ? "dark" : "light";
  } catch (e) {}
})();`;
