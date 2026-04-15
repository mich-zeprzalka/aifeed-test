"use client";

import { useState, useCallback } from "react";
import { Search as SearchIcon } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import type { ArticleWithRelations } from "@/lib/data";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArticleWithRelations[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => performSearch(val), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer, performSearch]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1
          className="mb-6 text-4xl sm:text-5xl font-heading font-extrabold tracking-tight"
        >
          Wyszukiwarka
        </h1>
        <div className="relative mx-auto max-w-lg">
          <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Szukaj newsów AI, modeli, badań..."
            value={query}
            onChange={handleChange}
            className="w-full h-12 rounded-xl border border-border bg-card pl-11 pr-4 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            autoFocus
          />
        </div>
      </div>

      {searched && (
        <p className="mb-6 text-[13px] text-muted-foreground">
          {loading
            ? "Szukam..."
            : `${results.length} wynik${results.length !== 1 ? "ów" : ""} dla "${query}"`}
        </p>
      )}

      {results.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {results.map((article, i) => (
            <div key={article.id} className={`animate-fade-in-up stagger-${i + 1}`}>
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">Żadne artykuły nie zostały znalezione.</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Spróbuj wpisać inne hasło.</p>
        </div>
      ) : null}
    </div>
  );
}
