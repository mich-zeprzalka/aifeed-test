"use client";

import { useState, useEffect, useCallback } from "react";
import { List, ChevronDown } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // Generate id matching how ReactMarkdown generates heading ids
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ id, text, level });
    }
  }

  return headings;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if fewer than 3 headings
  if (headings.length < 3) return null;

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
    }
  }, []);

  // Track active heading via Intersection Observer
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  return (
    <>
      {/* Mobile: collapsible */}
      <div className="lg:hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <List className="size-4 text-muted-foreground" />
            Spis treści
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <nav className="mt-2 rounded-xl border border-border/60 bg-card p-4">
              <ul className="space-y-1">
                {headings.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => handleClick(h.id)}
                      className={`block w-full text-left text-body-sm leading-relaxed transition-colors hover:text-foreground ${
                        h.level === 3 ? "pl-4" : ""
                      } ${
                        activeId === h.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop: sticky sidebar-style within content */}
      <div className="hidden lg:block float-right ml-6 mb-4 w-56">
        <nav className="rounded-xl border border-border/60 bg-card/80 p-4">
          <p className="flex items-center gap-2 text-label font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">
            <List className="size-3.5" />
            Spis treści
          </p>
          <ul className="space-y-1">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => handleClick(h.id)}
                  className={`block w-full text-left text-body-sm leading-relaxed transition-colors hover:text-foreground ${
                    h.level === 3 ? "pl-3 border-l border-border/40" : ""
                  } ${
                    activeId === h.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
