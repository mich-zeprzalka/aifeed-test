"use client";

import { useEffect, useLayoutEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useScrollY } from "@/lib/hooks/use-scroll-y";

// useLayoutEffect warns on the server; swap to useEffect during SSR.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ScrollToTop() {
  const pathname = usePathname();
  const scrollY = useScrollY();
  const visible = scrollY > 400;

  // Reset scroll SYNCHRONOUSLY before paint on route change so the user never
  // sees the previous page's scroll position applied to the new page. Running
  // in useEffect (after paint) leaves a visible flash — the new page is shown
  // at the old scroll offset and then jumps. Anchor links (URL hash) are
  // honored — the browser scrolls to the target itself, so we skip the reset.
  useIsoLayoutEffect(() => {
    if (window.location.hash) return;

    // `behavior: "instant"` overrides any CSS `scroll-behavior: smooth` for
    // this programmatic jump. A smooth animation on route change looks like
    // the navigation failed.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Wróć na górę"
      className={`fixed bottom-5 right-5 z-40 flex size-10 items-center justify-center rounded-full border border-border/60 bg-card/90 backdrop-blur-sm text-muted-foreground shadow-md transition-all duration-300 hover:text-foreground hover:border-primary/40 hover:shadow-lg ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
