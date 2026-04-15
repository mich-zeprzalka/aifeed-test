"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/config/site";

const TICKER_ITEMS = [
  { title: "Claude 4 Opus przełamuje bariery rozumowania i generowania kodu", slug: "claude-4-opus-reasoning-code-generation" },
  { title: "Google DeepMind prezentuje Gemini Ultra 2.0 z rozumieniem wideo", slug: "google-deepmind-gemini-ultra-2-video" },
  { title: "Open Source dorównuje GPT-4o — Llama 4 zmienia reguły gry", slug: "llama-4-matches-gpt4o-open-source" },
  { title: "Cursor 2.0 redefiniuje programowanie z AI", slug: "cursor-2-multi-agent-workflows" },
  { title: "AI odkrywa nowy antybiotyk na superbakterie", slug: "ai-discovers-antibiotic-drug-resistant" },
];

const NAV_LINKS = [
  { name: "Najnowsze", href: "/" },
  { name: "Wyszukiwarka", href: "/search" },
  { name: "RSS", href: "/feed.xml" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Ticker — full-width scrolling links with dot separators */}
      <div className="relative z-[60] border-b border-border bg-foreground overflow-hidden pause-on-hover">
        <div className="flex">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="animate-marquee flex items-center whitespace-nowrap"
              aria-hidden={copy === 1 || undefined}
            >
              {TICKER_ITEMS.map((item, i) => (
                <span key={i} className="contents">
                  <Link
                    href={`/article/${item.slug}`}
                    className="px-3 py-1.5 text-[11px] text-background/70 hover:text-background transition-colors"
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    {item.title}
                  </Link>
                  <span className="text-background/30 text-[8px]">&bull;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
              aifeed<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Desktop nav — utility links */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
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
            <Link
              href="/search"
              aria-label="Szukaj"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="size-[15px]" />
            </Link>
            <ThemeToggle />

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-[15px]" /> : <Menu className="size-[15px]" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-border/50 bg-background md:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-0.5">
                {siteConfig.categories.map((cat) => {
                  const href = `/category/${cat.slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={cat.slug}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
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
        )}
      </header>
    </>
  );
}
