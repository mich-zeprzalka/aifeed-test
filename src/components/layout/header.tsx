"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, Search, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/config/site";
import { SearchModal } from "./search-modal";

const NAV_LINKS = [
  { name: "Najnowsze", href: "/" },
  { name: "RSS", href: "/feed.xml" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "/" && !searchOpen) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — also works as scroll-to-top when already on the home page
              (Next.js skips the route change when href matches current path,
              so we need an explicit handler). */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
              aifeed<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Desktop nav — utility links */}
          <nav aria-label="Nawigacja główna" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Szukaj (Ctrl+K)"
              title="Szukaj (Ctrl+K)"
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="size-4" />
            </button>
            <ThemeToggle />

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav — animated with grid-rows transition */}
        <div
          id="mobile-nav"
          className={`grid md:hidden transition-[grid-template-rows] duration-300 ease-out ${
            mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/50 bg-background">
              <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-0.5">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === "/" ? "page" : undefined}
                    className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      pathname === "/"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Wszystko
                  </Link>
                  {siteConfig.categories.map((cat) => {
                    const href = `/kategoria/${cat.slug}`;
                    const active = pathname === href;
                    return (
                      <Link
                        key={cat.slug}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                      >
                        {cat.name}
                      </Link>
                    );
                  })}
                  <hr className="my-2 border-border/40" />
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
