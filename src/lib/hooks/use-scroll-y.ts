"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared window-scroll subscription.
 *
 * Multiple components previously attached their own `window.scroll` listeners
 * (ReadingProgress, ScrollToTop, …) — each one reading `scrollY` on every
 * frame. This module hosts a single listener that notifies React subscribers
 * via `useSyncExternalStore`, so N components pay the cost of one listener.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let attached = false;
let lastY = 0;

function handleScroll() {
  lastY = window.scrollY;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (!attached && typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll, { passive: true });
    lastY = window.scrollY;
    attached = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && attached && typeof window !== "undefined") {
      window.removeEventListener("scroll", handleScroll);
      attached = false;
    }
  };
}

function getSnapshot(): number {
  return lastY;
}

// SSR: scroll is always 0 on the server — avoids hydration mismatch.
function getServerSnapshot(): number {
  return 0;
}

/** Current `window.scrollY` as React state. Safe on the server. */
export function useScrollY(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
