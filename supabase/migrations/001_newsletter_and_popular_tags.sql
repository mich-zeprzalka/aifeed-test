-- Migration 001 — newsletter_subscribers + popular_tags RPC
-- =============================================================================
-- Apply once in Supabase SQL Editor (dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: `IF NOT EXISTS` / `CREATE OR REPLACE` — safe to re-run.
-- =============================================================================

-- Tabela subskrybentów newslettera. Service role ONLY (no public policy) —
-- zapis i odczyt wyłącznie przez admin client.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Celowo brak publicznych policy — dostęp tylko przez service role key.

-- RPC: agreguje top N tagów po użyciu (server-side GROUP BY).
-- Używane przez getPopularTags() w src/lib/data.ts zamiast pobierania
-- całej tabeli article_tags do JS'a. `STABLE` → cacheable per query.
CREATE OR REPLACE FUNCTION popular_tags(tag_limit INT)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, count BIGINT) AS $$
  SELECT t.id, t.name, t.slug, COUNT(*) AS count
  FROM article_tags at
  JOIN tags t ON at.tag_id = t.id
  GROUP BY t.id, t.name, t.slug
  ORDER BY count DESC
  LIMIT tag_limit;
$$ LANGUAGE SQL STABLE;

-- Quick smoke test after running — powinien zwrócić listę tagów posortowanych
-- po `count` DESC (puste gdy w bazie nie ma jeszcze article_tags):
-- SELECT * FROM popular_tags(10);
