"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Standard shadcn-style ThemeProvider wrapper around next-themes. Forwards all
// props (attribute, defaultTheme, enableSystem, disableTransitionOnChange, …)
// so the consumer can configure behaviour from the call site without changing
// this file. next-themes handles SSR/CSR theme reconciliation, FOUC
// prevention via its own injected script, and exposes `useTheme()` to any
// descendant client component.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
