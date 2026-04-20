"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Show/hide floating button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
