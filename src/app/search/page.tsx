"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, FileQuestion } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ArticleWithRelations } from "@/lib/data";

function pluralize(count: number): string {
  if (count === 1) return "wynik";
  if (count >= 2 && count <= 4) return "wyniki";
  return "wyników";
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
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

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

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
        <h1 className="mb-6 text-4xl sm:text-5xl font-heading font-extrabold tracking-tight">
          Wyszukiwarka
        </h1>
        <div className="relative mx-auto max-w-lg">
          <label htmlFor="search-input" className="sr-only">Szukaj artykułów</label>
          <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            id="search-input"
            type="search"
            placeholder="Szukaj newsów AI, modeli, badań..."
            value={query}
            onChange={handleChange}
            className="w-full h-12 rounded-xl border border-border bg-card pl-11 pr-4 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            autoFocus
          />
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {searched && (
          <p className="mb-6 text-[13px] text-muted-foreground">
            {loading
              ? "Szukam..."
              : `${results.length} ${pluralize(results.length)} dla "${query}"`}
          </p>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {results.map((article, i) => (
            <div key={article.id} className={`animate-fade-in-up stagger-${i + 1}`}>
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <EmptyState
          icon={FileQuestion}
          title="Żadne artykuły nie zostały znalezione."
          description="Spróbuj wpisać inne hasło."
        />
      ) : null}
    </div>
  );
}
