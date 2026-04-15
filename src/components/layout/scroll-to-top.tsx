"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Force instantaneous scroll to top
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
