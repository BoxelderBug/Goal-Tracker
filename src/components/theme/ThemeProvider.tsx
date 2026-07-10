"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isMode,
  isTheme,
  resolveMode,
  type Mode,
  type Theme,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToRoot(theme: Theme, mode: Mode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.mode = resolveMode(mode, prefersDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read localStorage on the client; on the server they fall
  // back to defaults, which is safe because every consumer renders client-side
  // (the auth gate shows a plain loading screen in server HTML).
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  });
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === "undefined") return DEFAULT_MODE;
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return isMode(stored) ? stored : DEFAULT_MODE;
  });

  useEffect(() => {
    applyToRoot(theme, mode);
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToRoot(theme, mode);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, mode]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ theme, mode, setTheme, setMode }),
    [theme, mode, setTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
