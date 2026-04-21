# AiFeed — Dokumentacja Projektu

> Stan na: **2026-04-21**
> Wersja: 0.1.0
> Autor analizy: Claude Opus 4.7

---

## Spis treści

1. [Czym jest AiFeed](#1-czym-jest-aifeed)
2. [Architektura](#2-architektura)
3. [Stack technologiczny](#3-stack-technologiczny)
4. [Struktura repozytorium](#4-struktura-repozytorium)
5. [Baza danych (Supabase)](#5-baza-danych-supabase)
6. [Pipeline AI (scraping → generacja → publikacja)](#6-pipeline-ai)
7. [Warstwa danych `src/lib/data.ts`](#7-warstwa-danych)
8. [API endpoints](#8-api-endpoints)
9. [Routing i strony](#9-routing-i-strony)
10. [System komponentów](#10-system-komponentów)
11. [Design system i style](#11-design-system-i-style)
12. [SEO — co jest, czego nie ma](#12-seo)
13. [Bezpieczeństwo](#13-bezpieczeństwo)
14. [Wydajność](#14-wydajność)
15. [Testy](#15-testy)
16. [Konfiguracja i środowisko](#16-konfiguracja-i-środowisko)
17. [Wdrożenie i deployment](#17-wdrożenie-i-deployment)
18. [🔴 Błędy, nieścisłości, niekonsekwencje — RAPORT KRYTYCZNY](#18-raport-krytyczny)
19. [🎯 Rekomendowana roadmapa](#19-rekomendowana-roadmapa)

---

## 1. Czym jest AiFeed

**AiFeed** to polskojęzyczny, w pełni zautomatyzowany magazyn informacyjny o AI. Serwis sam:

1. **Scrape'uje** 18 źródeł RSS (TechCrunch, The Verge, Ars Technica, MIT TR, OpenAI Blog, DeepMind, Anthropic, arXiv, Spider's Web, AntyWeb itd.)
2. **Selekcjonuje** najlepsze artykuły przez scoring (świeżość + dywersyfikacja źródeł)
3. **Pobiera pełną treść** ze strony źródłowej (scraping HTML)
4. **Generuje** po polsku kompletny artykuł przez OpenRouter (Claude Sonnet 4)
5. **Ocenia jakość** (quality gate, score 0-100, próg 50)
6. **Dobiera miniaturkę** — najpierw `og:image` ze źródła, w razie braku Gemini 2.5 Flash Image
7. **Zapisuje** do Supabase z tagami, kategorią, linkami zwrotnymi
8. **Publikuje** natychmiast — brak ingerencji człowieka

Pipeline leci w Vercel Cron 3× dziennie (5:00, 11:00, 17:00).

**Produkcja:** `https://aifeed.pl` i `https://www.aifeed.pl` (aliasy na projekt Vercel `aifeed-pl`)

---

## 2. Architektura

### Diagram przepływu danych

```
                   ┌───────────────────────┐
                   │  Vercel Cron (3×/dzień)│
                   └───────────┬───────────┘
                               ▼
        ┌──────────────────────────────────────────┐
        │  /api/cron/generate (Node, maxDuration=300) │
        │  ─────────────────────────────────────── │
        │  1. scrapeAllFeeds()     (18 źródeł RSS)  │
        │  2. dedupe vs scraped_items                │
        │  3. selectTopArticles()  (greedy scoring)  │
        │  4. for each top item:                     │
        │     ├─ scrapeArticleContent() → plain text │
        │     ├─ generateArticle() → OpenRouter      │
        │     ├─ assessArticleQuality() ≥ 50         │
        │     ├─ getArticleThumbnail() og:image/AI   │
        │     ├─ insert into articles                │
        │     └─ upsert tags + article_tags          │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Supabase (PostgreSQL)                    │
        │  articles · categories · tags ·           │
        │  article_tags · scraped_items             │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Next.js 16 App Router (RSC + ISR 60s)    │
        │  /                → home                  │
        │  /article/[slug]  → single post           │
        │  /category/[slug] → category list         │
        │  /tag/[slug]      → tag list              │
        │  /search          → client search         │
        │  /about /privacy                          │
        │  /sitemap.xml /robots.txt /feed.xml       │
        └──────────────────────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │        Czytelnik       │
                   └───────────────────────┘
```

### Warstwy

- **Edge / Middleware** — security headers (`src/middleware.ts`)
- **Server (RSC)** — strony i route handlers, czytanie z Supabase przez anon key
- **Client components** — wyłącznie interaktywne (`use client`): Header, SearchModal, NewsTicker, ThemeToggle, NewsletterForm, ReadingProgress, TableOfContents, CategoryBar, ShareButtons, ScrollToTop, SearchPage
- **Admin client** — `createAdminClient()` używa `SUPABASE_SERVICE_ROLE_KEY`, omija RLS, wyłącznie w pipeline i newsletter POST
- **Browser client** — `src/lib/supabase/client.ts` (zdefiniowany, **nie używany nigdzie**)
- **Server cookie client** — `src/lib/supabase/server.ts` (**nie używany nigdzie** — brak sesji użytkownika)

---

## 3. Stack technologiczny

### Core
- **Next.js 16.2.3** (App Router, React Compiler włączony: `reactCompiler: true`)
- **React 19.2.4** (RSC + `useSyncExternalStore`, `useMemo`, `useCallback`)
- **TypeScript 5** (strict mode — wnioskuję z zachowania `tsc --noEmit`)
- **Node 24.x** (Vercel runtime)

### Dane
- **Supabase** (`@supabase/supabase-js` 2.103 + `@supabase/ssr` 0.10)
- **PostgreSQL** — tabele `articles`, `categories`, `tags`, `article_tags`, `scraped_items`
- **Supabase Storage** — bucket `thumbnails` dla AI-generowanych obrazów

### AI
- **OpenRouter** — `anthropic/claude-sonnet-4` (pisanie artykułów) + `google/gemini-2.5-flash-image` (miniaturki)

### UI
- **shadcn/ui 4.2** (na `@base-ui/react` 1.3 — **UWAGA:** to NIE jest klasyczne Radix!)
- **Tailwind CSS 4** (nowa składnia `@utility`, `@theme`, `@custom-variant`, bez `tailwind.config.js`)
- **lucide-react** ikony
- **next-themes** 0.4
- **sonner** — toast (zainstalowany, **nie używany**)
- **cmdk** — command palette (zainstalowany, **nie używany**)
- **tw-animate-css** — animacje (zainstalowane, w globals.css)

### Testing
- **Vitest 4** + `@testing-library/react` 16 + `jsdom` 29

### Deployment
- **Vercel** — projekt `aifeed-pl` w team `m-zeprzalkas-projects`
- **Cron** skonfigurowany w `vercel.json` (3×/dzień)

---

## 4. Struktura repozytorium

```
aifeed/
├── .vercel/project.json          # powiązanie z projektem aifeed-pl
├── vercel.json                   # cron jobs (PRZESTARZAŁA konwencja — zob. §16)
├── next.config.ts                # image remotePatterns, reactCompiler
├── tsconfig.json
├── vitest.config.ts
├── postcss.config.mjs
├── components.json               # shadcn/ui config
├── eslint.config.mjs
├── AGENTS.md                     # instrukcje dla AI asystentów
├── CLAUDE.md                     # -> AGENTS.md
│
├── supabase/
│   └── schema.sql                # tabele + RLS + seed kategorii
│
├── src/
│   ├── middleware.ts             # security headers
│   │
│   ├── app/
│   │   ├── layout.tsx            # root layout (Header, NewsTicker, Footer, JSON-LD)
│   │   ├── globals.css           # Tailwind 4 @theme + prose-article + animacje
│   │   ├── manifest.ts           # PWA manifest (lang: pl)
│   │   ├── robots.ts             # robots.txt
│   │   ├── sitemap.ts            # sitemap.xml (articles + categories + tags)
│   │   ├── not-found.tsx         # 404
│   │   ├── feed.xml/route.ts     # RSS feed
│   │   │
│   │   ├── (home)/page.tsx       # strona główna
│   │   ├── about/page.tsx        # o serwisie
│   │   ├── privacy/page.tsx      # polityka prywatności
│   │   ├── search/page.tsx       # wyszukiwarka (client)
│   │   │
│   │   ├── article/[slug]/
│   │   │   ├── page.tsx          # single post (breadcrumbs, TOC, prose, share, related)
│   │   │   ├── loading.tsx       # skeleton
│   │   │   └── error.tsx         # error boundary
│   │   │
│   │   ├── category/[slug]/
│   │   │   ├── page.tsx          # lista kategorii z paginacją cursor-based
│   │   │   └── loading.tsx
│   │   │
│   │   ├── tag/[slug]/page.tsx   # lista tag
│   │   │
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   ├── generate/route.ts  # główny pipeline
│   │   │   │   └── seed/route.ts      # manualny seed
│   │   │   ├── newsletter/route.ts    # zapis maila
│   │   │   └── search/route.ts        # wyszukiwarka
│   │   │
│   │   └── examples/             # statyczne HTML mockupy (nie produkcyjne)
│   │
│   ├── components/
│   │   ├── layout/               # Header, Footer, NewsTicker, NewsletterForm,
│   │   │                         # ScrollToTop, SearchModal, ThemeToggle
│   │   ├── articles/             # ArticleCard, Breadcrumbs, CategoryBar,
│   │   │                         # ReadingProgress, ShareButtons, TableOfContents
│   │   └── ui/                   # shadcn: Button, Card, Dialog, Sheet, Input,
│   │                             # Pagination, Skeleton, ScrollArea, EmptyState...
│   │
│   ├── config/
│   │   ├── site.ts               # siteConfig (URL, kategorie)
│   │   └── site.test.ts
│   │
│   ├── lib/
│   │   ├── data.ts               # wszystkie read-only query do Supabase
│   │   ├── data.test.ts          # testy (PROBLEM: duplikują logikę — §18)
│   │   ├── rate-limit.ts         # in-memory sliding window
│   │   ├── rate-limit.test.ts
│   │   ├── utils.ts              # cn()
│   │   │
│   │   ├── ai/
│   │   │   ├── prompts.ts        # ARTICLE_SYSTEM_PROMPT + USER_PROMPT
│   │   │   ├── writer.ts         # generateArticle() — OpenRouter + META parser
│   │   │   └── quality.ts        # assessArticleQuality() — score 0-100
│   │   │
│   │   ├── scraper/
│   │   │   ├── sources.ts        # RSS_SOURCES (18 feedów)
│   │   │   ├── parser.ts         # scrapeAllFeeds + selectTopArticles
│   │   │   └── content.ts        # scrapeArticleContent (pełny tekst)
│   │   │
│   │   ├── images/
│   │   │   └── generator.ts      # og:image scrape → AI fallback → Storage
│   │   │
│   │   └── supabase/
│   │       ├── admin.ts          # createAdminClient (service role)
│   │       ├── client.ts         # browser client (nie używany)
│   │       └── server.ts         # cookie server client (nie używany)
│   │
│   ├── test/setup.ts             # @testing-library/jest-dom
│   └── types/database.ts         # TS types dla tabel
│
└── public/                       # favicon, icons, og-image
```

---

## 5. Baza danych (Supabase)

### Schemat (`supabase/schema.sql`)

| Tabela | Kolumny kluczowe | Uwagi |
|---|---|---|
| `categories` | id (UUID), name, slug (UNIQUE), description, color | Seed: 6 kategorii PL |
| `articles` | id, title, slug (UNIQUE), excerpt, content, category_id (FK), thumbnail_url, thumbnail_source, source_urls[], source_titles[], reading_time, is_featured, is_published, published_at | RLS: public read gdzie `is_published = true` |
| `tags` | id, name (UNIQUE), slug (UNIQUE) | |
| `article_tags` | article_id, tag_id | composite PK, ON DELETE CASCADE |
| `scraped_items` | id, source_url (UNIQUE), title, description, source_name, is_processed | Cache dedup do pipeline |

### Indeksy
- `idx_articles_slug`, `idx_articles_published(is_published, published_at DESC)`, `idx_articles_category`, `idx_articles_featured(is_featured, published_at DESC)`, `idx_scraped_items_url`

### RLS policies
- `articles` — public SELECT gdzie `is_published = true`
- `categories`, `tags`, `article_tags` — public SELECT (bez filtrów)
- `scraped_items` — brak policy (admin-only via service role)

### Brakujące w schemacie
- `newsletter_subscribers` — tabela używana przez `/api/newsletter` ale **NIE jest w schema.sql** (§18.2)
- Brak `thumbnails` bucket w migracji — tworzony imperatywnie w kodzie (idempotentnie, ale bez migration-as-code)

### Bieżący stan
- **172 artykułów** (stan na 2026-04-21 po ręcznym triggerze pipeline)
- 6 kategorii (hardcoded w `site.ts` i seed SQL)

---

## 6. Pipeline AI

### `scrapeAllFeeds()` — `src/lib/scraper/parser.ts`

- Parsuje 18 feedów RSS równolegle (`Promise.allSettled`)
- Max 10 itemów per feed
- **Filtr AI** — whitelist słów kluczowych (`ai`, `llm`, `gpt`, `claude`, `gemini`, `neural`...) lub zawsze-relewantne źródło (OpenAI, Anthropic, arXiv itd.)
- Deduplikacja po URL
- Sort: najnowsze pierwsze

### `selectTopArticles(articles, count)` — greedy scoring

```
score = freshnessScore − diversityPenalty
freshnessScore = max(0, 100 − hoursOld × 2)
diversityPenalty = sourceCount[source] × 20
```

Wybiera `count` najlepszych, karząc kolejne artykuły z tego samego źródła.

### `scrapeArticleContent(url)` — `src/lib/scraper/content.ts`

1. Fetch z User-Agent Chrome 120, timeout 15s, follow redirects
2. Reject non-HTML content-type
3. Detekcja PDF/binary (`%PDF`, `endobj`, `endstream`)
4. Strip `<script>`, `<style>`, `<noscript>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<svg>`, `<iframe>`, komentarze
5. Priorytet: `<article>` > `<main>` > `<body>`
6. HTML → plain text (break, paragraph, heading)
7. Decode encji: `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&#8217;` itd.
8. Truncate do 6000 znaków
9. Odrzuca <100 znaków
10. Sprawdza ratio znaków drukowalnych (≥70%)

### `generateArticle(topic, urls, descriptions, sourceContent)` — `src/lib/ai/writer.ts`

- Model: `anthropic/claude-sonnet-4` via OpenRouter
- `max_tokens: 4096`, timeout 90s
- System prompt narzuca:
  - WIERNOŚĆ ŹRÓDŁU, zakaz halucynacji, liczby/daty/cytaty tylko z źródła
  - Polski dziennikarski, 600-1200 słów
  - Markdown: `##` nagłówki, listy, cytaty (nie `#`)
  - Link do źródła w 1-2 akapicie
  - Obowiązkowa sekcja `## Kluczowe wnioski`
  - Bieżąca data: `new Date().toISOString().split("T")[0]`
- Output split: treść + META (JSON) po `---META---`
- Parser META ma **3 strategie fallback**:
  1. Delimiter `---META---`
  2. Pattern match `{..."title"...}` (ostatni JSON blok)
  3. Fix trailing commas + smart quotes → straight quotes

### `assessArticleQuality(article)` — `src/lib/ai/quality.ts`

| Check | Kara |
|---|---|
| Brak sekcji "Kluczowe wnioski" | −15 |
| Brak linku markdown | −25 |
| <100 słów | −35 |
| 100-199 słów | −20 |
| Brak `##` nagłówka | −10 |
| Tytuł <15 znaków | −15 |
| Excerpt <50 znaków | −10 |
| <2 tagi | −5 |
| Nieznana kategoria | −10 |

Próg odrzucenia: score < 50.

### `getArticleThumbnail(title, sourceUrl, sourceName)` — `src/lib/images/generator.ts`

1. **scrape og:image** ze źródła (FREE)
   - Regex w obie strony atrybutów
   - Resolve relative URL
   - HEAD check: `image/*`, size > 5 KB (pomija tracking pixele)
2. **AI generation** (Gemini 2.5 Flash Image) jeśli (1) padło
   - Upload base64 do Supabase Storage bucket `thumbnails`
3. Zwraca `{ url, source }` gdzie `source=null` oznacza AI-generated

### Cały pipeline — `/api/cron/generate/route.ts`

```ts
1.  Bearer ${CRON_SECRET} auth
2.  scrapedItems = await scrapeAllFeeds()
3.  existing = supabase.from("scraped_items").in("source_url", urls)
4.  newItems = scrapedItems.filter(!existing)
5.  topItems = selectTopArticles(newItems, count)   // count via ?count=N, max 15
6.  for each item:
    6a. sourceContent = scrapeArticleContent(item.url)
    6b. if sourceContent.length < 100 → skip + upsert as processed
    6c. article = generateArticle(...)
    6d. refusalCheck (patterns "nie można", "brak treści"...)
    6e. quality = assessArticleQuality(article) ≥ 50
    6f. thumbnail = getArticleThumbnail(...)
    6g. slug = slugify(title, { locale: "pl" })[:80] + "-" + Date.now().toString(36)
    6h. find category by slug
    6i. insert article
    6j. for each tag: upsert tag + link article_tags
    6k. upsert scraped_items(is_processed=true)
7.  return { message, generated[], rejected[], scraped, new }
```

---

## 7. Warstwa danych

`src/lib/data.ts` — wszystkie zapytania do DB dla frontu (anon key, read-only).

### Funkcje
- `getArticles(limit)` — najnowsze opublikowane
- `getFeaturedArticles()` — `is_featured=true`, max 5
- `getArticleBySlug(slug)`
- `getArticlesByCategory(slug)` — wszystko (bez limitu!)
- `getArticlesByCategoryPaginated(slug, pageSize, cursor)` — cursor-based (po `published_at`)
- `getCategories()`, `getCategoryBySlug(slug)`
- `searchArticles(query)` — ILIKE na title + excerpt, limit 20
- `getArticlesGroupedByCategory(slugs, limitPerCategory)` — 1 query + in-memory group
- `getPopularTags(limit)` — 3-step (count junction → top IDs → fetch tags)
- `getSitemapArticles(limit=5000)` — slug+updated_at+is_featured
- `getTickerArticles(limit)` — title+slug
- `getTagBySlug(slug)`, `getArticlesByTag(slug)`, `getAllTags()`
- `getAdjacentArticles(articleId, categoryId, publishedAt)` — prev/next w kategorii

### Optymalizacje
- `attachTagsBatch()` — 1 query zamiast N+1
- `escapeIlike()` — escape `%`, `_`, `\` dla ILIKE

### Antypatterny / problemy
- Singleton `supabase = getSupabase()` na **top-level module** — wykona się raz per cold start funkcji, ale w dev hot-reload może dziwnie działać (§18.6)
- `getArticlesByCategory` (bez paginacji) zwraca WSZYSTKO — potencjalnie setki rekordów (§18.8)
- `getPopularTags` pobiera WSZYSTKIE rzędy z `article_tags` i agreguje w JS — O(N) w bazie bez LIMIT, rośnie liniowo (§18.9)
- `searchArticles` używa `.or()` z interpolowanym query — podatne na syntax bugs jeśli query zawiera `,` lub `)` (§18.5)

---

## 8. API endpoints

| Endpoint | Metoda | Auth | Rate limit | Uwagi |
|---|---|---|---|---|
| `/api/cron/generate` | GET + POST | Bearer CRON_SECRET | brak | 300s timeout, 1-15 items, używany przez Vercel Cron (GET) |
| `/api/cron/seed` | POST + GET | Bearer CRON_SECRET | brak | Ręczny seed dla pustego DB; GET zwraca metadata |
| `/api/newsletter` | POST | brak | 5/min/IP | Upsert do `newsletter_subscribers` |
| `/api/search` | GET | brak | 30/min/IP | Wrapper nad `searchArticles()` |

### Uwagi bezpieczeństwa
- **CRON_SECRET w obu cronach** — `if (cronSecret && authHeader !== ...)` — jeśli env var nieustawiony, **endpoint jest otwarty** (§18.1)
- Newsletter rate limit jest **per-instance** (in-memory Map) — nie działa na wielu instancjach Vercel (§18.10)

---

## 9. Routing i strony

### Struktura route'ów

| Route | Typ | Revalidate | Uwagi |
|---|---|---|---|
| `/` | Server + `(home)` route group | 300s | Hero + featured + latest + category highlights + newsletter |
| `/article/[slug]` | Server + RSC | 60s | TOC, prose, share, adjacent, related |
| `/category/[slug]` | Server | 300s | Cursor pagination (§18.11) |
| `/tag/[slug]` | Server | 300s | Brak paginacji |
| `/search` | Client | - | Debounce 300ms, initialQuery z `?q=` |
| `/about` | Server (static) | - | canonical: `/about` |
| `/privacy` | Server (static) | - | canonical: `/privacy` |
| `/feed.xml` | Route handler | 3600s | RSS 2.0 z escape (ostatnio naprawione) |
| `/sitemap.xml` | Metadata route | - | URL dla articles + categories + tags |
| `/robots.txt` | Metadata route | - | Allow all, disallow `/api/` `/admin/` |

### Potencjalne problemy strukturalne
- **Całe URL-e po angielsku** (`/article/`, `/category/`, `/search/`, `/privacy`, `/about`) dla polskiej strony. Sugerowana polonizacja: `/artykul/`, `/kategoria/`, `/szukaj`, `/polityka-prywatnosci`, `/o-serwisie` (§18.14)
- Brak redirectów dla potencjalnych wariantów slugów
- Brak strony `/tag` (lista wszystkich tagów) — linki są tylko do konkretnych

---

## 10. System komponentów

### Layout (`src/components/layout/`)

| Komponent | Typ | Odpowiedzialność |
|---|---|---|
| `Header` | client | Sticky nav, logo, search trigger, theme toggle, mobile drawer z kategoriami |
| `NewsTicker` | client | Marquee na WAAPI (Element.animate()) — niezależny od Header, nie restartuje się na nawigację |
| `Footer` | server | Branding, kategorie, linki, newsletter |
| `NewsletterForm` | client | POST /api/newsletter, states idle/loading/success/error |
| `ScrollToTop` | client | Floating button + reset scroll na route change |
| `SearchModal` | client | Ctrl+K nie podpięte (§18.18); debounce 400ms |
| `ThemeToggle` | client | `useSyncExternalStore` + MutationObserver na `html.class` |

### Artykuły (`src/components/articles/`)

| Komponent | Typ | Uwagi |
|---|---|---|
| `ArticleCard` | server | 3 warianty: default / featured / compact |
| `Breadcrumbs` | server | + JSON-LD `BreadcrumbList` |
| `CategoryBar` | client | Scroll pos w sessionStorage |
| `ReadingProgress` | client | `role="progressbar"`, fixed top |
| `ShareButtons` | client | X / LinkedIn / Facebook + copy + `navigator.share` przez useSyncExternalStore |
| `TableOfContents` | client | Prosta lista `<a href="#id">` |

### UI (shadcn/ui `src/components/ui/`)
Button, Card, Dialog, Sheet, Input, InputGroup, Textarea, Badge, Avatar, Breadcrumb, Pagination, Skeleton, ScrollArea, DropdownMenu, NavigationMenu, Separator, Sonner, EmptyState, Command.

**Nie używane**: Command (cmdk), Sonner (toast). Zainstalowane ale bez referencji.

---

## 11. Design system i style

### Tailwind 4 (nowa składnia)

- `globals.css` — `@import "tailwindcss"`, `@theme inline { --color-* }`, `@custom-variant dark (&:is(.dark *))`, `@utility`, `@layer base`
- Brak `tailwind.config.js` (Tailwind 4 nie wymaga)
- `postcss.config.mjs` → `@tailwindcss/postcss`

### Paleta (OKLCH)
- Light: neutral-navy foreground, purple primary
- Dark: deep navy background, luminous purple accents
- CSS custom props: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, etc.

### Typografia
- Heading: Plus Jakarta Sans (500/600/700/800)
- Body: Inter
- Mono: JetBrains Mono (400/500/600)
- `.prose-article` — klasa własna (nie `@tailwindcss/typography`) z `scroll-margin-top: 5rem` na h2/h3

### Animacje
- `tw-animate-css` (utilitki)
- `.animate-fade-in-up`, `.stagger-{1..6}` (keyframes + delays)
- `prefers-reduced-motion` respected (w globals.css)

### Motyw
- Skrypt inline w `<head>` wczytuje z localStorage + `prefers-color-scheme` przed hydratacją (zapobiega flash) — poprawnie.

---

## 12. SEO

### Co jest

- ✅ Metadata API Next.js (title template, OG, Twitter, canonical per-page)
- ✅ JSON-LD: `Organization` (layout), `WebSite` z SearchAction (home), `NewsArticle` (single), `BreadcrumbList` (breadcrumbs), `CollectionPage`+`ItemList` (tag), `ItemList` (category)
- ✅ Sitemap z priorytetami
- ✅ RSS 2.0 feed (z poprawnym escape'em od ostatniej poprawki)
- ✅ Metadata base + lang=pl, locale=pl_PL
- ✅ Open Graph images z fallback
- ✅ `rel="nofollow noopener noreferrer"` na share links
- ✅ Reading time + structured data
- ✅ 404 strona

### Czego brakuje / co jest zepsute
- 🔴 **Canonical URL mismatch www vs non-www** — `siteConfig.url = https://aifeed.pl`, ale serwis hostowany na `www.aifeed.pl` z redirectem `aifeed.pl → www.aifeed.pl`. Sitemap i canonicals wskazują na non-www, ale Google trafia na www. Solution: `NEXT_PUBLIC_SITE_URL=https://www.aifeed.pl` w env + redirect www zachowany (§18.3)
- 🔴 **Angielskie route'y** dla polskiej strony (§18.14)

- 🟡 **Brak `manifest.webmanifest` linku w metadata** — jest `manifest.ts` ale nie powiązany explicite (Next auto-robi, ale warto zweryfikować)
- 🟡 **JSON-LD dla tag page** zwraca pusty jeśli brak artykułów — dobra praktyka, ale można dodać CollectionPage dla wszystkich
- 🟡 Brak `author` w `NewsArticle` JSON-LD (jest `Organization` zamiast `Person` — akceptowalne dla newsroomów)
- 🟡 Article page NIE ma `og:image` ze swoim thumbnail gdy thumbnail jest null — fallback na siteConfig.ogImage dobry, ale thumbnail z AI powinien zawsze być
- 🟡 Brak CSP/HSTS headers w middleware

---

## 13. Bezpieczeństwo

### Pozytywy
- RLS włączony na wszystkich tabelach ze stosownymi policy
- Anon key w kodzie klienta — poprawne (RLS chroni)
- Service role key tylko server-side (admin.ts, cron, newsletter POST)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control
- Rate limit na newsletter (5/min) i search (30/min)
- Input validation email (regex)
- Cron authorized via Bearer secret
- External links na share mają `rel="nofollow noopener noreferrer"`

### Problemy
- 🔴 **Fail-open na CRON_SECRET** — jeśli env unset, endpoint otwarty (§18.1)
- 🔴 **Brak CSP** — podatność na inline script injection przez np. artykuły z markdown (mitygowane przez `react-markdown` sanitize, ale brak defense-in-depth)
- 🔴 **`dangerouslySetInnerHTML` dla JSON-LD bez sanitize** — OK bo JSON.stringify, ale jeśli title/description zawierałoby `</script>`, można uciec (§18.15)
- 🟡 **Rate limit in-memory** — nie działa multi-region (§18.10)
- 🟡 **Search query nie ma max length** — DoS potencjał (§18.12)
- 🟡 **scrapeArticleContent fetch nie sprawdza hostname allowlist** — SSRF jeśli pipeline zje URL wewnętrzny (mitygowane bo URL z RSS, ale brak defense-in-depth)
- 🟡 **Brak HSTS header w middleware**
- 🟡 **Brak Content-Security-Policy header**

---

## 14. Wydajność

### Dobre praktyki
- React Compiler ON — auto-memoizacja
- Next.js Image z `sizes` i `priority` na hero
- ISR `revalidate: 60-3600s` per route
- `attachTagsBatch` eliminuje N+1
- `Promise.all` w kilku miejscach
- Lazy component loading — ale mało (tylko client components są split naturalnie)
- `prefetch` Next.js na Link (domyślnie)

### Problemy i miejsca na optymalizację
- 🟡 `NewsTicker` odczytuje `firstCopy.offsetWidth` w `useEffect` — może trigger layout, ale jednorazowo na mount. OK.
- 🟡 `ReadingProgress` i `ScrollToTop` — 2 osobne scroll listenery, można scalić
- 🟡 `getArticlesByCategory` BEZ paginacji — zwraca wszystko (§18.8)
- 🟡 `getPopularTags` pobiera wszystkie `article_tags` — O(N) rośnie z bazą (§18.9)
- 🟡 `getArticlesGroupedByCategory` pobiera wszystkie opublikowane artykuły z kategorii, grupuje w JS — przy dużej bazie to problem (§18.9)
- 🟡 `ScrollToTop` reset scroll na każdą zmianę pathname — może psuć doświadczenie scroll-restoration przeglądarki przy nawigacji wstecz
- 🟡 Brak prefetch wyselekcjonowanych linków w hero, brak preload obrazów
- 🟡 Brak `@vercel/analytics` ani `@vercel/speed-insights` — SEO/observability blind spot

---

## 15. Testy

### Co jest (`vitest run` — 25 testów passed)
- `src/lib/data.test.ts` — testy `escapeIlike` i `pluralize`
- `src/lib/rate-limit.test.ts` — 4 testy `rateLimit()`
- `src/components/ui/empty-state.test.tsx` — RTL testy
- `src/config/site.test.ts` — (nie czytałem, ale jest)

### Problemy
- 🔴 **`data.test.ts` re-implementuje funkcje zamiast importować** — testuje się SWÓJ KOD testu, nie logikę aplikacji. Zmiana w `data.ts::escapeIlike` nie zepsuje testu (§18.4)
- 🔴 **Brak testów integracyjnych pipeline'u** — 0 testów `parser.ts`, `writer.ts`, `quality.ts`, `content.ts`, `generator.ts`
- 🔴 **Brak testów komponentów** oprócz EmptyState — ArticleCard, Header, NewsTicker, TOC, ShareButtons, CategoryBar, NewsletterForm bez coverage
- 🔴 **Brak testów API routes** — 0 testów `/api/newsletter`, `/api/search`, `/api/cron/*`
- 🟡 Brak E2E (Playwright/Cypress)
- 🟡 Testy rate-limit używają real `Date.now()` i live in-memory store — fragile przy równoległym runie

---

## 16. Konfiguracja i środowisko

### Zmienne środowiskowe

| Zmienna | Cel | Gdzie |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS-protected) | Vercel + .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (bypass RLS) | Vercel (secure) |
| `OPENROUTER_API_KEY` | OpenRouter API | Vercel (secure) |
| `CRON_SECRET` | Bearer dla cron auth | Vercel (secure) |
| `NEXT_PUBLIC_SITE_URL` | Used by siteConfig | **NIE USTAWIONE** na Vercel (§18.3) — fallback na `https://aifeed.pl` |

### `vercel.json` — **PRZESTARZAŁE**

```json
{
  "crons": [
    { "path": "/api/cron/generate?count=10", "schedule": "0 5 * * *" },
    { "path": "/api/cron/generate?count=5",  "schedule": "0 11 * * *" },
    { "path": "/api/cron/generate?count=5",  "schedule": "0 17 * * *" }
  ]
}
```

Zgodnie z bieżącymi wytycznymi Vercela (2026), preferowana forma to **`vercel.ts`** (TypeScript config z `@vercel/config`), ale to nie jest błąd krytyczny — JSON nadal wspierany (§18.19).

### `next.config.ts`
- `reactCompiler: true` ✅
- `images.remotePatterns` — ma wildcard `**` na HTTPS co jest **permissive** (potrzebne bo AI pipeline scrape'uje z nieprzewidywalnych domen)

### `middleware.ts` matcher

```ts
"/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|feed.xml).*)"
```

Komentarz mówi "except static files and api routes" ale w rzeczywistości `/api/*` **nie jest wykluczone** → middleware leci na API. Komentarz wprowadza w błąd (§18.16).

---

## 17. Wdrożenie i deployment

### Aktywna infrastruktura
- **Vercel Project**: `aifeed-pl` (id: `prj_rmKqGPpHZ6crRr7wTbYhGTO1tNRS`)
- **Team**: `m-zeprzalkas-projects`
- **Git repo**: `mich-zeprzalka/aifeed-test` (drugie konto GitHub)
- **Domeny**: `aifeed.pl`, `www.aifeed.pl` (aliasy)
- **Cron**: 3×/dzień (5:00, 11:00, 17:00 UTC — UWAGA: nie wiem czy chcesz lokalny TZ)
- **Node runtime**: 24.x
- **Deploy cadence**: ręczny push → auto-deploy; ostatnie ~10 produkcji w ciągu ostatnich 18h = normalny rytm

### Znany debt
- Drugi, **martwy** projekt Vercel (`aifeed`, prj_J7S0Azvo8FhnnvBBgFHq2zZjjemm) z jednym env (NEWS_API_KEY) i 434-dniową produkcją. Powinien zostać usunięty (§18.20)
- Lokalny git `origin` był do `m-zeprzalka/aifeed`, obecnie zmieniony na `mich-zeprzalka/aifeed-test` ale brak write access do tego drugiego repo z aktualnego SSH key

---

## 18. 🔴 RAPORT KRYTYCZNY — BŁĘDY, NIEŚCISŁOŚCI, NIEKONSEKWENCJE

Klasyfikacja:
- **P0** — krytyczny, bug/security
- **P1** — ważny, wpływa na użytkownika/SEO/wydajność
- **P2** — drobny, czyszczenie/higiena

---

### 18.1 [P0] Fail-open w autoryzacji cron

**Plik:** `src/app/api/cron/generate/route.ts:17`, `src/app/api/cron/seed/route.ts:50`

```ts
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

Jeśli `CRON_SECRET` nie jest ustawiony (`undefined`), **warunek `cronSecret &&` = false** → auth jest pomijany, endpoint otwarty dla świata. Każdy może wywołać pipeline i koszt OpenRouter.

**Fix:**
```ts
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### 18.2 [P0] Tabela `newsletter_subscribers` nie istnieje w schema.sql

**Plik:** `src/app/api/newsletter/route.ts:41`, `supabase/schema.sql`

Endpoint robi `upsert` do `newsletter_subscribers`, ale tabela **nie jest zdefiniowana** w schemacie. Jeśli produkcja ma ją ręcznie dodaną — OK, ale brak migracji. Przy nowej instalacji / odtworzeniu DB → newsletter psuje się.

**Fix:** dopisać do `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Brak policy — tylko admin client (service role) może pisać/czytać
```

---

### 18.3 [P0] Canonical URL mismatch www vs non-www

**Plik:** `src/config/site.ts:5`

```ts
url: process.env.NEXT_PUBLIC_SITE_URL || "https://aifeed.pl"
```

`NEXT_PUBLIC_SITE_URL` **nie jest ustawiony** w Vercel → fallback na non-www. Ale produkcja redirectuje `aifeed.pl → www.aifeed.pl`. Efekt:

- `<link rel="canonical" href="https://aifeed.pl/article/xyz">`
- Użytkownik jest na `https://www.aifeed.pl/article/xyz`
- Google widzi dwa URL-e dla tego samego contentu, canonical je rozbraja ale suboptymalne

**Fix:** `vercel env add NEXT_PUBLIC_SITE_URL https://www.aifeed.pl` (All Environments) LUB zmienić redirect aby `www → non-www`.

---

### 18.4 [P0] Testy w `data.test.ts` re-implementują funkcje

**Plik:** `src/lib/data.test.ts:5-7`, `src/lib/data.test.ts:40-44`

```ts
// Test the escapeIlike function by extracting its logic
// (we can't import it directly since it's not exported, so we test the pattern)
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}
```

Testy testują **kopię funkcji w tym samym pliku**, nie rzeczywistą implementację. Jeśli ktoś zmieni `data.ts::escapeIlike`, test nadal przejdzie. To nie jest test, to dokumentacja.

**Fix:** eksport `escapeIlike` z `data.ts` i import w teście. Alternatywnie — wyciągnąć do osobnego pliku `lib/search-utils.ts`.

Tak samo `pluralize` jest zdefiniowany i w `search/page.tsx`, i w `data.test.ts` — kopia.

---

### 18.5 [P1] `searchArticles` podatne na PostgREST injection syntactic

**Plik:** `src/lib/data.ts:228-235`

```ts
.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)
```

`escapeIlike` eskejpuje `%`, `_`, `\` dla ILIKE, ale **nie eskejpuje `,`, `(`, `)`** które są syntax chars w `.or()`. Query `"foo,bar"` → `title.ilike.%foo,bar%,excerpt.ilike.%foo,bar%` → PostgREST parsuje to jako 3 filtry (nieprawidłowo).

W praktyce — przy query z `,` zwróci błąd lub zły rezultat, nie data leak. Ale warto fix.

**Fix:** escape nawiasów i przecinków lub przejść na dedykowaną funkcję `websearch_to_tsquery` / full-text search w PG:
```ts
const sanitized = escaped.replace(/[,()]/g, " ");
```

---

### 18.6 [P1] Module-level Supabase singleton w `data.ts`

**Plik:** `src/lib/data.ts:15`

```ts
const supabase = getSupabase();
```

Wykonuje się przy import — rzucając błąd jeśli env vars brakuje. W dev hot-reload może być OK, ale w produkcji każda funkcja serwerowa zaimportowana z data.ts natychmiast łączy się z Supabase, nawet jeśli nie wywołuje query (np. w module tree-shake'owanym niedoskonale).

**Fix:** lazy singleton:
```ts
let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (!_client) _client = getSupabase();
  return _client;
}
```

---

### 18.7 [P1] Zachłanny quality gate — pierwsza linia obrony zbyt surowa?

**Plik:** `src/lib/ai/quality.ts`

- Brak linka → −25 punktów. Jeśli AI zapomni formatu `[text](url)` ale zapisze raw URL → automatycznie −25.
- Dobry ale krótki artykuł: 190 słów = OK jakość, −20 punktów = score 80, przeżyje. 150 słów = −20, pozostałe warunki = może spaść pod 50.

W pipeline run z 10 itemów dostaliśmy **7 generated, 0 rejected, 3 "zniknięte"** — te 3 wpadły do `catch` wcześniej, nie do quality gate. Ale quality gate jest rygorystyczny dla krótszych artykułów.

**Fix:** rozważ dodanie "soft warnings" — score 40-60 = oznacz, ale zachowaj; score <40 = reject. Obecnie threshold 50 jest stosunkowo ostre dla artykułu <200 słów.

---

### 18.8 [P1] `getArticlesByCategory` bez limitu

**Plik:** `src/lib/data.ts:119-142`

```ts
export async function getArticlesByCategory(categorySlug: string)
```

Nie ma `limit()`. Dla kategorii z 500+ artykułami, frontend dostaje wszystko. Ta funkcja jest **nie używana w stronach produkcyjnych** (category używa wariantu paginated), ale siedzi w exportach. Albo usunąć, albo dodać limit domyślny.

---

### 18.9 [P1] `getPopularTags` pobiera wszystkie `article_tags` rekordy

**Plik:** `src/lib/data.ts:304-343`

```ts
const { data: countRows } = await supabase.from("article_tags").select("tag_id");
```

Bez LIMIT. Przy 172 artykułach × ~4 tagi = 688 rekordów — jeszcze OK. Przy 10000 artykułów × 4 tagi = 40k rekordów przez sieć przy KAŻDYM renderowaniu home (pomimo cache 300s).

**Fix:** Supabase RPC z SQL GROUP BY:
```sql
CREATE OR REPLACE FUNCTION popular_tags(tag_limit INT)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, count BIGINT) AS $$
  SELECT t.id, t.name, t.slug, COUNT(*) AS count
  FROM article_tags at JOIN tags t ON at.tag_id = t.id
  GROUP BY t.id ORDER BY count DESC LIMIT tag_limit;
$$ LANGUAGE SQL STABLE;
```

Wtedy: `supabase.rpc('popular_tags', { tag_limit: 10 })`.

---

### 18.10 [P1] Rate limit in-memory nie działa multi-instance

**Plik:** `src/lib/rate-limit.ts`

Vercel fluid compute może mieć wiele instancji. `Map` jest per-instance. Atakujący może łatwo obejść limit 5/min przez re-try pod różnymi endpointami.

**Fix:** Upstash Redis + `@upstash/ratelimit` (oficjalna integracja Vercel Marketplace) lub Supabase table z TTL.

---

### 18.11 [P1] Pagination "Previous" idzie do page 1 zamiast poprzedniej

**Plik:** `src/components/ui/pagination.tsx:37-43`, `src/lib/data.ts:151-201`

```tsx
{hasPrev ? (
  <Link href={basePath}>Nowsze</Link>  // <-- zawsze reset do page 1
```

Przycisk "Nowsze" w category pagination zawsze wraca do strony pierwszej, nie poprzedniej. `prevCursor` jest obliczany w data.ts ale nie wykorzystany. UX — użytkownik traci kontekst przy przeglądaniu.

**Fix:** przechodzimy na offset pagination (`?page=N`) lub prawdziwą bi-directional cursor (zachowywać stack kursorów w URL lub sessionStorage).

---

### 18.12 [P1] Brak max-length na search query

**Plik:** `src/app/api/search/route.ts:27`, `src/lib/data.ts:227`

```ts
const query = request.nextUrl.searchParams.get("q") || "";
// ...
const results = await searchArticles(query.trim());
```

Query o długości 100 KB zostanie przekazane jako ILIKE pattern. PostgREST zwróci błąd lub spowolni DB. DoS wektor.

**Fix:** `if (query.length > 100) return Response.json([]);`

---

### 18.13 [P2] `siteConfig.links.github` i `twitter` — placeholdery

**Plik:** `src/config/site.ts:7-10`

```ts
links: {
  twitter: "https://twitter.com/aifeed",    // to konto istnieje?
  github: "https://github.com/aifeed",       // konto organizacji?
}
```

`sameAs` w JSON-LD Organization używa tych linków. Jeśli nie istnieją → niepoprawna karta Google.

---

### 18.14 [P1] Angielskie URL-e dla polskiej strony

**Route'y:**
- `/about` → `/o-serwisie`
- `/article/[slug]` → `/artykul/[slug]`
- `/category/[slug]` → `/kategoria/[slug]`
- `/search` → `/szukaj`
- `/privacy` → `/polityka-prywatnosci`

Wpływa na SEO polskiego rynku. Słowa kluczowe w URL to ranking factor. Wymaga:
1. Zmiany struktury katalogów w `src/app/`
2. Update wszystkich `<Link href>` (~46 miejsc)
3. Update sitemap, feed.xml, JSON-LD
4. 301 redirecty z starych URL-i w `next.config.ts` lub middleware

---

### 18.15 [P2] JSON-LD renderowane przez `dangerouslySetInnerHTML` bez sanitize

**Pliki:** wiele (layout, article page, breadcrumbs, tag page, sitemap)

```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

`JSON.stringify` nie eskejpuje `</script>` w stringach. Artykuł z tytułem `Test</script><script>alert(1)</script>` mógłby uciec. W praktyce title pochodzi z AI/RSS, ale...

**Fix:**
```ts
const safe = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
```

---

### 18.16 [P2] Middleware matcher comment jest mylący

**Plik:** `src/middleware.ts:19`

Komentarz: `Match all paths except static files and api routes` — ale matcher **nie wyklucza** `/api/*`. Middleware leci na API (co jest OK), ale komentarz w błąd wprowadza.

**Fix:** poprawić komentarz lub dodać `api` do wykluczeń jeśli intencjonalnie.

---

### 18.17 [P2] Nieużywane zależności i pliki

- `sonner` — zainstalowane, `toast` nigdzie nie wywołane
- `cmdk` — zainstalowane, Command UI istnieje ale nie używane
- `src/lib/supabase/client.ts` — browser client, nigdzie nie importowany (nie ma logowania)
- `src/lib/supabase/server.ts` — server cookie client, nie używany
- `src/app/examples/*.html` — statyczne mockupy (5 plików HTML), publicznie dostępne przez Next (route `/examples/index2.html`)

**Fix:** usunąć nieużywane, lub jeśli planowane — oznaczyć w TODO.

**UWAGA:** `/src/app/examples/` z HTML publikuje się jako **dostępne route'y** — Next router nie podąża plikom `.html`, ale to moze nie działać. Zweryfikować.

---

### 18.18 [P2] Brak skrótu Ctrl+K dla SearchModal

`SearchModal` istnieje i jest wywoływany tylko przez klik na ikonę search w Header. Brak keyboardhandle'a dla `Cmd+K`/`Ctrl+K` — standard w nowoczesnych portalach.

**Fix:**
```ts
useEffect(() => {
  const h = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSearchOpen(true);
    }
  };
  window.addEventListener('keydown', h);
  return () => window.removeEventListener('keydown', h);
}, []);
```

---

### 18.19 [P2] `vercel.json` — przestarzała forma

Aktualne wytyczne Vercela preferują `vercel.ts` z `@vercel/config`. JSON nadal działa, ale nie ma typecheck, dynamicznej logiki ani per-env var support. Niekrytyczne.

---

### 18.20 [P2] Martwy projekt Vercel `aifeed`

Istnieje drugi projekt `aifeed` (stary, 434d, jedna env var `NEWS_API_KEY`, trzy failujące preview deploys). Nie powoduje szkód, ale dług organizacyjny.

**Fix:** `vercel project rm aifeed` z dashboardu.

---

### 18.21 [P2] `RSS_SOURCES` — nie wszystkie polskie źródła są AI-focused

- **Spider's Web** (`spidersweb.pl/feed`) — ogólny tech, nie AI. Aktualny filtr słów kluczowych to mitiguje, ale szum w bazie
- **AntyWeb** — podobnie
- **Niebezpiecznik** — security, rzadko AI. Kategoria `etyka` — OK dla regulacji, ale merytoryczne dopasowanie słabe

**Fix:** wymienić na bardziej AI-skoncentrowane polskie źródła (Fundacja Panoptykon, SzpiegOk, lub RSS z PolskieAI.pl)

---

### 18.22 [P2] `NewsTicker` — WAAPI distance calculation race condition

**Plik:** `src/components/layout/news-ticker.tsx:27-33`

```ts
const firstCopy = track.firstElementChild as HTMLElement | null;
const distance = firstCopy.offsetWidth;
if (distance === 0) return;
```

Jeśli fonty się ładują, `offsetWidth` może być 0 lub niepoprawne. Timing race.

**Fix:** `document.fonts.ready` albo ResizeObserver:
```ts
const ro = new ResizeObserver(() => { /* rebuild animation */ });
ro.observe(firstCopy);
```

---

### 18.23 [P2] `getAdjacentArticles` używa `.single()` na potencjalnie pustych query

**Plik:** `src/lib/data.ts:436-457`

`.single()` zwraca error gdy 0 rekordów. Obecny kod: `prevResult.data || null` — OK, ale `.maybeSingle()` byłoby czystsze i nie generuje error w logach.

---

### 18.24 [P2] `scrapeArticleContent` nie ma allowlisty hostów

**Plik:** `src/lib/scraper/content.ts:7`

Fetch dowolnego URL. Obecnie pipeline dostaje URL z RSS → jest pewien poziom pośredni. Ale jeśli ktoś zmanipuluje RSS feed żeby zawierał `http://localhost:8080/admin`, scraper spróbuje.

**Fix:** sprawdź `url` przez `new URL(url)` i wyłącz `localhost`, `127.0.0.1`, `0.0.0.0`, RFC1918 ranges.

---

### 18.25 [P2] Brak `@vercel/analytics` i `@vercel/speed-insights`

Brak instrumentacji. Brak danych o realnym user experience (Core Web Vitals).

**Fix:** `npm i @vercel/analytics @vercel/speed-insights` + dodaj `<Analytics />` i `<SpeedInsights />` do root layout.

---

### 18.26 [P2] Pipeline błąd-silent przy częściowych porażkach

**Plik:** `src/app/api/cron/generate/route.ts:185-187`

```ts
catch (error) {
  console.error(`Failed to generate article for "${item.title}":`, error);
}
```

Błąd wpada do logu, ale endpoint zwraca `generated: 0` jakby wszystko było OK. Bez observability (drainów, Sentry) tracisz sygnał że pipeline się pruje.

**Fix:** dodać licznik `failed: string[]` do response, i akumulować tam errory:
```ts
} catch (error) {
  failed.push({ title: item.title, error: String(error) });
}
// ...
return Response.json({ ..., failed });
```

---

### 18.27 [P2] Brak `.env.example` aktualnego

**Plik:** `.env.example`

Brak `UNSPLASH_ACCESS_KEY` — wcześniej Vercel miał taki var, już nie używany. OK. Ale nie ma `NEXT_PUBLIC_SITE_URL` wyjaśnionego że DLA PRODUKCJI powinien być `https://www.aifeed.pl`, nie `https://aifeed.pl`.

---

### 18.28 [P2] Inconsistent error handling w data.ts

Niektóre funkcje logują error (`console.error`), inne nie. Niektóre zwracają `[]`, inne `null`, inne `{ articles: [], ... }`. Brak standardu.

**Fix:** wspólny helper:
```ts
function handleQuery<T>(result: { data: T | null; error: PostgrestError | null }, fallback: T): T {
  if (result.error) {
    console.error('[data]', result.error.message);
    return fallback;
  }
  return result.data ?? fallback;
}
```

---

### 18.29 [P2] Katalog `src/app/examples/` publikowany

W build'zie Next.js pliki `.html` w `app/` NIE są obsługiwane (router oczekuje `page.tsx`). Ale jest możliwe że Next nie czyści ich z output. Do weryfikacji — ALE te mockupy (`index.html`, `index2.html`...) nie powinny być na produkcji.

**Fix:** przenieść do `docs/examples/` poza `src/`.

---

### 18.30 [P2] `slugify` hack z `Date.now().toString(36)`

**Plik:** `src/app/api/cron/generate/route.ts:112-116`

```ts
const slug = slugify(article.title, ...).slice(0, 80) + "-" + Date.now().toString(36);
```

Zawsze dodaje timestamp suffix, nawet jeśli tytuł jest unikalny. Efekt: slug nieczytelny, SEO słabsze. Jeśli kolizja — lepiej retry ze zmianą lub counter.

**Fix:**
```ts
let baseSlug = slugify(article.title, ...).slice(0, 80);
let finalSlug = baseSlug;
let attempt = 0;
while (await existsInDb(finalSlug)) {
  attempt++;
  finalSlug = `${baseSlug}-${attempt}`;
}
```

Alternatywnie: zostaw timestamp, ale bardziej zwięzły (MM-YYYY).

---

### 18.31 [P2] Polska diakrytyka usuwana z IDs nagłówków

**Plik:** `src/components/articles/table-of-contents.tsx:13-15`, `src/app/article/[slug]/page.tsx:192-200`

```ts
const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
```

`\w` w JS nie matchuje `ą`, `ć`, `ę`, `ł`, `ń`, `ó`, `ś`, `ź`, `ż`. Stripowane. Dla nagłówka "Kluczowe wnioski" → `kluczowe-wnioski` OK. Dla "Bezpieczeństwo sieci" → `bezpieczestwo-sieci` (brak `ń`). Niebrzydkie URL-e ale #anchory mogą się zgubić jeśli 2 nagłówki różnią się tylko diakrytyką.

**Fix:** użyć `slugify` zamiast regex, albo dodać `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`.

---

### 18.32 [P2] Pipeline per-source cap 10 itemów bez żadnej randomizacji

**Plik:** `src/lib/scraper/parser.ts:26`

```ts
const items = (feed.items || []).slice(0, 10);
```

Zawsze pierwsze 10 z każdego feed. Niektóre feedy pokazują 50+ itemów w RSS, niektóre 5. Bez priorytetyzacji "jeszcze nie widziane" — polega na dedup w cron/generate.

OK pragmatycznie, ale przy bardzo aktywnym feedzie (TechCrunch) może gubić 40 itemów między uruchomieniami pipeline.

---

## 19. 🎯 REKOMENDOWANA ROADMAPA

### Faza 0 — HIGIENA (teraz, ~2h)
1. **Fix fail-open cron** (§18.1) — 5 min, 2 linie
2. **Dodaj `newsletter_subscribers` do schema.sql** (§18.2) — 5 min
3. **Ustaw `NEXT_PUBLIC_SITE_URL` w Vercel** (§18.3) — 2 min
4. **Usuń martwy projekt `aifeed` na Vercel** (§18.20) — 1 min
5. **Dodaj `@vercel/analytics` i `@vercel/speed-insights`** (§18.25) — 10 min
6. **Zrotuj pozostałe klucze** z "Need to Rotate" (SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET) — 15 min
7. **Usuń nieużywane deps** (`sonner`, `cmdk`) lub zaplanuj użycie (§18.17) — decyzja

### Faza 1 — SEO i semantyka (~1 dzień)
1. **Polonizacja URL-i** (§18.14) — wieloetapowa:
   - rename folderów `app/about → app/o-serwisie` itd.
   - search&replace `href="/article/...` → `href="/artykul/...`
   - sitemap, RSS, JSON-LD
   - redirecty 301 w `next.config.ts`:
     ```ts
     async redirects() {
       return [
         { source: '/article/:slug', destination: '/artykul/:slug', permanent: true },
         { source: '/category/:slug', destination: '/kategoria/:slug', permanent: true },
         { source: '/search', destination: '/szukaj', permanent: true },
         { source: '/privacy', destination: '/polityka-prywatnosci', permanent: true },
         { source: '/about', destination: '/o-serwisie', permanent: true },
       ];
     }
     ```
2. **Fix diakrytyki w heading IDs** (§18.31)
3. **JSON-LD escape `</script>`** (§18.15) — wszystkie miejsca
4. **Pełniejsze testy SEO z `next-seo-check` lub manualnie w Search Console**

### Faza 2 — Refaktor danych (~1-2 dni)
1. **`getPopularTags` jako RPC** (§18.9)
2. **Supabase full-text search** zamiast ILIKE dla `searchArticles` (§18.5)
3. **Upstash Redis dla rate-limit** (§18.10)
4. **Lazy Supabase client** (§18.6)
5. **Ujednolicone error handling** (§18.28)

### Faza 3 — UX i paginacja (~1 dzień)
1. **Prawdziwa paginacja bi-directional** w category (§18.11)
2. **Ctrl+K dla search** (§18.18)
3. **Poprawki TOC** (już częściowo zrobione, ale zostaw prostotę)
4. **ReadingProgress + ScrollToTop w jednym listener'ze**

### Faza 4 — Pipeline i AI (~2-3 dni)
1. **Observability** — drainy Vercel + failed count w cron response (§18.26)
2. **Supabase `articles` oznaczanie wersji pipeline** (dodać kolumnę `ai_model_version`, `pipeline_version`)
3. **Retry strategy** dla OpenRouter 5xx
4. **Image generation — zapasowy provider** (np. FAL.ai) jeśli Gemini zawodzi
5. **SSRF hardening** w scraper (§18.24)

### Faza 5 — Testing (~1-2 dni)
1. **Naprawić `data.test.ts`** — eksportować funkcje (§18.4)
2. **Testy jednostkowe** dla `parser.ts`, `content.ts`, `quality.ts`, `writer.ts::extractMeta`
3. **Testy integracyjne** dla API routes (z mock Supabase)
4. **E2E** z Playwright (home, search, article, newsletter)
5. **Golden path test** pipeline'u

### Faza 6 — Polish (~0.5 dnia)
1. Usunięcie `examples/` (§18.29)
2. **Lepsze słowa kluczowe w polskich źródłach RSS** (§18.21)
3. **`vercel.ts` zamiast `vercel.json`** (§18.19) — opcjonalne
4. **`.env.example` aktualizacja** (§18.27)
5. **Dokumentacja dla contributorów** (CONTRIBUTING.md)

---

## PODSUMOWANIE WYKONAWCZE

**Projekt jest w bardzo dobrym stanie** jak na MVP z w pełni zautomatyzowanym pipeline'em AI. Architektura jest przejrzysta, dobór technologii trafia w aktualny stan ekosystemu (Next 16, RSC, Tailwind 4, React Compiler), a pipeline AI jest dobrze zaprojektowany (wierność źródłu, quality gate, fallback strategie).

**Najpilniejsze kwestie:**
1. 🔴 **Fail-open autoryzacja cron** — `P0 security` (§18.1)
2. 🔴 **Brakująca tabela newsletter w schemacie** — `P0 data integrity` (§18.2)
3. 🔴 **Canonical URL vs serving URL** — `P0 SEO` (§18.3)
4. 🔴 **Testy które nic nie testują** — `P0 software quality` (§18.4)

Zdecydowanie zacznij od **Fazy 0** — to 2h pracy dające największy zwrot (bezpieczeństwo, SEO, observability).

Następnie **Faza 1 (polonizacja URL)** jest największą inwestycją SEO pod polski rynek — jeden dzień pracy za skok w rankingu.

Reszta fazami 2-6 to "clean as you go" — ulepszenia architekturalne i jakość, rozłożone w czasie.

---

*Wygenerowane automatycznie przez Claude Opus 4.7 · 2026-04-21*
