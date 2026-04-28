"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// CSS-only icon swap — both icons render, but Tailwind's `dark:` variant
// (configured against the `.dark` class set by next-themes on <html>) shows
// only the active one. No mount state, no useEffect, no hydration mismatch.
// The button itself is `suppressHydrationWarning` because aria-label flips
// based on resolvedTheme, which is only known on the client.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Włącz tryb jasny" : "Włącz tryb ciemny"}
      suppressHydrationWarning
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Sun className="size-4 hidden dark:block" aria-hidden="true" />
      <Moon className="size-4 block dark:hidden" aria-hidden="true" />
    </button>
  );
}
