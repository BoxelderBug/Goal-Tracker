"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { THEMES, type Mode, type Theme } from "@/lib/theme";

const NEXT_MODE: Record<Mode, Mode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const MODE_ICON: Record<Mode, string> = {
  light: "☀️",
  dark: "🌙",
  system: "🖥️",
};

export function ThemeControls() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Color theme"
        className="w-auto py-1 text-sm"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        {THEMES.map((name) => (
          <option key={name} value={name}>
            {name[0].toUpperCase() + name.slice(1)}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        aria-label={`Appearance: ${mode}. Switch to ${NEXT_MODE[mode]}.`}
        title={`Appearance: ${mode}`}
        onClick={() => setMode(NEXT_MODE[mode])}
      >
        {MODE_ICON[mode]}
      </Button>
    </div>
  );
}
