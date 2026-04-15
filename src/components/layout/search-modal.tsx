"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: abortController.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search failed:", err);
        }
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setQuery("");
        setResults([]);
        setLoading(false);
      }, 200);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-background border-border/60 shadow-2xl">
        <DialogHeader className="p-0 border-b border-border/50">
          <DialogTitle className="sr-only">Wyszukaj artykuły</DialogTitle>
          <div className="flex items-center px-4 py-3">
            <Search className="size-5 text-muted-foreground shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Szukaj newsów AI, modeli, raportów..."
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground ml-3 shrink-0" />}
          </div>
        </DialogHeader>

        <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto no-scrollbar pb-2">
          {query.trim() === "" ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Zacznij pisać aby odnaleźć tematy o sztucznej inteligencji...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/article/${result.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-4 group border-b border-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {result.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate opacity-80 mt-1">
                      {result.excerpt}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 mt-1" />
                </Link>
              ))}
            </div>
          ) : !loading && query.trim() !== "" ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Brak wyników dla "{query}". Spróbuj inaczej.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
