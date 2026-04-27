-- Migration 002 — trigger updated_at + indeks FK article_tags(tag_id)
-- =============================================================================
-- Aplikuj w Supabase SQL Editor jeśli Twoja DB była tworzona przed dodaniem
-- tych rzeczy do schema.sql. Idempotentne — `CREATE OR REPLACE`,
-- `DROP … IF EXISTS`, `CREATE INDEX IF NOT EXISTS`.
--
-- Świeże instalacje: nie rób — `schema.sql` ma już to wszystko.
-- =============================================================================

-- Trigger: automatycznie aktualizuje articles.updated_at przy każdym UPDATE.
-- Bez tego updated_at zawsze równa się created_at, co psuje sitemap.ts
-- (lastModified) i JSON-LD dateModified na stronie artykułu.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_set_updated_at ON articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Indeks dla FK article_tags(tag_id). Postgres nie auto-indexuje FK;
-- RPC popular_tags() robi JOIN po tag_id i bez tego indeksu skanuje całą
-- junction table przy każdym wywołaniu.
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);

-- Quick smoke test:
-- 1) UPDATE articles SET title = title WHERE id = (SELECT id FROM articles LIMIT 1);
--    Potem: SELECT created_at, updated_at FROM articles LIMIT 1;  — updated_at > created_at.
-- 2) EXPLAIN ANALYZE SELECT * FROM popular_tags(10);  — powinien użyć Index Scan na idx_article_tags_tag_id.
