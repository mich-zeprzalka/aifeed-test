-- AiFeed Database Schema
-- Run this in Supabase SQL Editor

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  thumbnail_url TEXT,
  thumbnail_source TEXT,
  source_urls TEXT[] DEFAULT '{}',
  source_titles TEXT[] DEFAULT '{}',
  reading_time INT DEFAULT 5,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- Article-Tag junction
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Scraped items cache
CREATE TABLE IF NOT EXISTS scraped_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  source_name TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  is_processed BOOLEAN DEFAULT false
);

-- Newsletter subscribers
-- Written via service-role client only (no public RLS policy intentionally).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_items_url ON scraped_items(source_url);

-- RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read articles" ON articles FOR SELECT USING (is_published = true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read article_tags" ON article_tags FOR SELECT USING (true);

-- Service role has full access via admin client (bypasses RLS)

-- RPC: aggregate top N tags by usage count (server-side GROUP BY).
-- Used by getPopularTags() in src/lib/data.ts. Falls back to in-memory
-- aggregation in the app when this function is missing.
CREATE OR REPLACE FUNCTION popular_tags(tag_limit INT)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, count BIGINT) AS $$
  SELECT t.id, t.name, t.slug, COUNT(*) AS count
  FROM article_tags at
  JOIN tags t ON at.tag_id = t.id
  GROUP BY t.id, t.name, t.slug
  ORDER BY count DESC
  LIMIT tag_limit;
$$ LANGUAGE SQL STABLE;

-- Seed categories
INSERT INTO categories (name, slug, description, color) VALUES
  ('Modele AI', 'modele-ai', 'Premiery, aktualizacje i porównania modeli AI', '#6366f1'),
  ('Badania i Nauka', 'badania', 'Przełomowe badania naukowe i odkrycia w dziedzinie AI', '#8b5cf6'),
  ('Biznes i Rynek', 'biznes', 'AI w biznesie, startupy, inwestycje i rynek technologiczny', '#06b6d4'),
  ('Etyka i Bezpieczeństwo', 'etyka', 'Regulacje, etyka AI, alignment i bezpieczeństwo systemów AI', '#f59e0b'),
  ('Narzędzia i Aplikacje', 'narzedzia', 'Nowe narzędzia, aplikacje i platformy wykorzystujące AI', '#10b981'),
  ('Poradniki', 'poradniki', 'Praktyczne tutoriale, przewodniki i porady dotyczące AI', '#ec4899')
ON CONFLICT (slug) DO NOTHING;
