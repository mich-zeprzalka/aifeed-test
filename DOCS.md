# AiFeed — Dokumentacja Projektu

> Stan na: **2026-04-21** (po rundzie napraw)
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
18. [✅ Zrealizowane poprawki (ta rewizja)](#18-zrealizowane-poprawki)
19. [🎯 Pozostały backlog](#19-pozostały-backlog)

---

## 1. Czym jest AiFeed

**AiFeed** to polskojęzyczny, w pełni zautomatyzowany magazyn informacyjny o AI. Serwis sam:

1. **Scrape'uje** 20 źródeł RSS (TechCrunch AI, The Verge AI, Ars Technica, VentureBeat AI, MIT TR, Wired AI, The Decoder, AI News, OpenAI, Google AI, DeepMind, Microsoft AI, NVIDIA, Hugging Face, Anthropic, arXiv, Spider's Web, AntyWeb, Niebezpiecznik, Hacker News AI)
2. **Selekcjonuje** najlepsze artykuły przez scoring (świeżość + dywersyfikacja źródeł)
3. **Pobiera pełną treść** ze strony źródłowej (scraping HTML, z walidacją hosta — no-SSRF)
4. **Generuje** po polsku kompletny artykuł przez OpenRouter (Claude Sonnet 4)
5. **Ocenia jakość** (quality gate, score 0-100, próg 50)
6. **Dobiera miniaturkę** — najpierw `og:image` ze źródła, w razie braku Gemini 2.5 Flash Image
7. **Zapisuje** do Supabase z tagami, kategorią, linkami zwrotnymi
8. **Publikuje** natychmiast — brak ingerencji człowieka

Pipeline leci w Vercel Cron 3× dziennie (5:00, 11:00, 17:00 UTC).

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
        │  1. scrapeAllFeeds()     (20 źródeł RSS)  │
        │  2. dedupe vs scraped_items                │
        │  3. selectTopArticles()  (greedy scoring)  │
        │  4. for each top item:                     │
        │     ├─ scrapeArticleContent() + SSRF guard │
        │     ├─ generateArticle() → OpenRouter      │
        │     ├─ assessArticleQuality() ≥ 50         │
        │     ├─ getArticleThumbnail() og:image/AI   │
        │     ├─ buildUniqueSlug() — kolizje retry   │
        │     ├─ insert into articles                │
        │     └─ upsert tags + article_tags          │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Supabase (PostgreSQL)                    │
        │  articles · categories · tags ·           │
        │  article_tags · scraped_items ·           │
        │  newsletter_subscribers                   │
        │  RPC: popular_tags(tag_limit)             │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Next.js 16 App Router (RSC + ISR 60s)    │
        │  /                → home                  │
        │  /article/[slug]  → single post           │
        │  /category/[slug] → category list (?page) │
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

- **Edge / Proxy** — security headers w `src/proxy.ts` (Next.js 16 rename z `middleware.ts`)
- **Server (RSC)** — strony i route handlers, czytanie z Supabase przez anon key
- **Client components** — wyłącznie interaktywne (`use client`): Header, SearchModal, NewsTicker, ThemeToggle, NewsletterForm, ReadingProgress, TableOfContents, CategoryBar, ShareButtons, ScrollToTop, SearchPage
- **Admin client** — `createAdminClient()` używa `SUPABASE_SERVICE_ROLE_KEY`, omija RLS, wyłącznie w pipeline i newsletter POST

---

## 3. Stack technologiczny

### Core
- **Next.js 16.2.3** (App Router, React Compiler włączony: `reactCompiler: true`, `proxy.ts` zamiast `middleware.ts`)
- **React 19.2.4** (RSC + `useSyncExternalStore`, `useMemo`, `useCallback`)
- **TypeScript 5** (strict mode)
- **Node 24.x** (Vercel runtime)

### Dane
- **Supabase** (`@supabase/supabase-js` 2.103 + `@supabase/ssr` 0.10)
- **PostgreSQL** — tabele `articles`, `categories`, `tags`, `article_tags`, `scraped_items`, `newsletter_subscribers`; RPC `popular_tags`
- **Supabase Storage** — bucket `thumbnails` dla AI-generowanych obrazów

### AI
- **OpenRouter** — `anthropic/claude-sonnet-4` (pisanie artykułów) + `google/gemini-2.5-flash-image` (miniaturki)

### UI
- **shadcn/ui 4.2** (na `@base-ui/react` 1.3 — **UWAGA:** to NIE jest klasyczne Radix!)
- **Tailwind CSS 4** (nowa składnia `@utility`, `@theme`, `@custom-variant`, bez `tailwind.config.js`)
- **lucide-react** ikony
- **next-themes** 0.4
- **tw-animate-css** — animacje
- **@vercel/analytics** — real user metrics (GA + Vercel Analytics obie instrumentacje)
- **@next/third-parties** — Google Analytics (G-5SD17PTF0C)

### Testing
- **Vitest 4** + `@testing-library/react` 16 + `jsdom` 29 — **28 testów passing**

### Deployment
- **Vercel** — projekt `aifeed-pl` w team `m-zeprzalkas-projects`
- **Cron** skonfigurowany w `vercel.json` (3×/dzień)

---

## 4. Struktura repozytorium

```
aifeed/
├── .vercel/project.json          # powiązanie z projektem aifeed-pl
├── vercel.json                   # cron jobs
├── next.config.ts                # image remotePatterns, reactCompiler
├── tsconfig.json
├── vitest.config.ts
├── postcss.config.mjs
├── components.json               # shadcn/ui config
├── eslint.config.mjs
├── AGENTS.md                     # instrukcje dla AI asystentów
├── CLAUDE.md                     # -> AGENTS.md
│
├── docs/
│   └── examples/                 # 5 statycznych mockupów HTML (wyjęte z src/app)
│
├── supabase/
│   └── schema.sql                # tabele + RLS + RPC popular_tags + seed kategorii
│
├── src/
│   ├── proxy.ts                  # security headers (rename z middleware.ts)
│   │
│   ├── app/
│   │   ├── layout.tsx            # root layout (Header, NewsTicker, Footer, JSON-LD, Analytics)
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
│   │   │   ├── page.tsx          # lista kategorii z paginacją ?page=N (offset-based)
│   │   │   └── loading.tsx
│   │   │
│   │   ├── tag/[slug]/page.tsx   # lista tag
│   │   │
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── generate/route.ts  # główny pipeline
│   │       │   └── seed/route.ts      # manualny seed
│   │       ├── newsletter/route.ts    # zapis maila
│   │       └── search/route.ts        # wyszukiwarka (max 100 znaków)
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
│   │   ├── data.ts               # wszystkie read-only query do Supabase (lazy client)
│   │   ├── data.test.ts          # testy — importują rzeczywisty kod
│   │   ├── search-utils.ts       # escapeIlike, sanitizeOrQuery, pluralize, MAX_LEN
│   │   ├── heading-id.ts         # slugifyHeading — diakrytyka-aware
│   │   ├── jsonld.ts             # jsonLdScript — escape </script>
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
│   │   │   ├── sources.ts        # RSS_SOURCES (20 feedów)
│   │   │   ├── parser.ts         # scrapeAllFeeds + selectTopArticles
│   │   │   └── content.ts        # scrapeArticleContent + SSRF host allowlist
│   │   │
│   │   ├── images/
│   │   │   └── generator.ts      # og:image scrape → AI fallback → Storage
│   │   │
│   │   └── supabase/
│   │       └── admin.ts          # createAdminClient (service role)
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
| `newsletter_subscribers` | id, email (UNIQUE), subscribed_at, unsubscribed_at | Bez public policy — zapis/odczyt wyłącznie service role |

### Indeksy
- `idx_articles_slug`, `idx_articles_published(is_published, published_at DESC)`, `idx_articles_category`, `idx_articles_featured(is_featured, published_at DESC)`, `idx_scraped_items_url`

### RLS policies
- `articles` — public SELECT gdzie `is_published = true`
- `categories`, `tags`, `article_tags` — public SELECT (bez filtrów)
- `scraped_items` — brak policy (admin-only via service role)
- `newsletter_subscribers` — brak policy (admin-only via service role)

### RPC
- `popular_tags(tag_limit INT) → (id, name, slug, count)` — server-side GROUP BY dla Trendów, zastępuje pobieranie całego `article_tags` do aplikacji

### Storage
- Bucket `thumbnails` — tworzony imperatywnie w kodzie (idempotentnie)

### Bieżący stan
- **172+ artykułów** (stan na 2026-04-21)
- 6 kategorii (spójne w `site.ts` i seed SQL)

---

## 6. Pipeline AI

### `scrapeAllFeeds()` — `src/lib/scraper/parser.ts`

- Parsuje 20 feedów RSS równolegle (`Promise.allSettled`), zdefiniowanych w `src/lib/scraper/sources.ts`
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

**SSRF hardening — walidacja URL przed fetch:**
- Parsuje URL przez `new URL(url)` (rzuca → reject)
- Wymaga protocol `http:` lub `https:`
- Odrzuca `localhost`, `*.localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.0.0/16` (link-local / AWS metadata), IPv6 loopback `::1`, IPv6 ULA `fc00::/7`

Dalej:
1. Fetch z User-Agent Chrome 120, timeout 15s, follow redirects
2. Reject non-HTML content-type
3. Detekcja PDF/binary (`%PDF`, `endobj`, `endstream`)
4. Strip `<script>`, `<style>`, `<noscript>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<svg>`, `<iframe>`, komentarze
5. Priorytet: `<article>` > `<main>` > `<body>`
6. HTML → plain text (break, paragraph, heading)
7. Decode encji
8. Truncate do 6000 znaków
9. Odrzuca <100 znaków
10. Sprawdza ratio znaków drukowalnych (≥70%)

### `generateArticle(topic, urls, descriptions, sourceContent)` — `src/lib/ai/writer.ts`

- Model: `anthropic/claude-sonnet-4` via OpenRouter
- `max_tokens: 4096`, timeout 90s
- System prompt narzuca wierność źródłu, polski dziennikarski, 600-1200 słów, markdown, obowiązkowa sekcja `## Kluczowe wnioski`
- Output split: treść + META (JSON) po `---META---`
- Parser META ma 3 strategie fallback

### `assessArticleQuality(article)` — `src/lib/ai/quality.ts`

Kary za braki (próg odrzucenia: score < 50):

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

### `getArticleThumbnail(title, sourceUrl)` — `src/lib/images/generator.ts`

1. **scrape og:image** ze źródła (FREE)
2. **AI generation** (Gemini 2.5 Flash Image) jeśli og:image padło; upload base64 do Supabase Storage bucket `thumbnails`

Podpis uproszczony — usunięty nieużywany 3-ci parametr `sourceName`.

### Cały pipeline — `/api/cron/generate/route.ts`

```ts
1.  Bearer ${CRON_SECRET} auth (fail-closed — brak secret = 401)
2.  scrapedItems = await scrapeAllFeeds()
3.  existing = supabase.from("scraped_items").in("source_url", urls)
4.  newItems = scrapedItems.filter(!existing)
5.  topItems = selectTopArticles(newItems, count)   // count via ?count=N, max 15
6.  for each item:
    6a. sourceContent = scrapeArticleContent(item.url)
    6b. if sourceContent.length < 100 → skip + upsert processed, failed.push("source-too-short")
    6c. article = generateArticle(...)
    6d. refusalCheck → failed.push("ai-refusal")
    6e. quality = assessArticleQuality(article) ≥ 50 → rejected.push(title)
    6f. thumbnail = getArticleThumbnail(...)
    6g. slug = buildUniqueSlug(...) — czysty slug, retry z numerem, ostatecznie timestamp
    6h. find category by slug (maybeSingle)
    6i. insert article (insertError → failed.push)
    6j. for each tag: upsert tag + link article_tags
    6k. upsert scraped_items(is_processed=true)
7.  return { message, generated[], rejected[], failed[{title,reason}], scraped, new }
```

---

## 7. Warstwa danych

`src/lib/data.ts` — wszystkie zapytania do DB dla frontu (anon key, read-only), **lazy singleton** (`db()` — client konstruowany przy pierwszym wywołaniu).

### Funkcje
- `getArticles(limit)` — najnowsze opublikowane
- `getFeaturedArticles()` — `is_featured=true`, max 5
- `getArticleBySlug(slug)` — `maybeSingle()`
- `getArticlesByCategory(slug, limit=50)` — bounded (było: bez limitu)
- `getArticlesByCategoryPaginated(slug, pageSize, page)` — **offset-based (`?page=N`)**, zwraca `{articles, page, totalPages, total, hasPrev, hasNext, pageSize}`
- `getCategories()`, `getCategoryBySlug(slug)`
- `searchArticles(query)` — `sanitizeOrQuery` (escape `%_\` + strip `,()` dla PostgREST `.or()`), limit 20
- `getArticlesGroupedByCategory(slugs, limitPerCategory)` — bounded pull (max 200 lub N×10)
- `getPopularTags(limit)` — **RPC `popular_tags(tag_limit)`** (server-side GROUP BY), fallback in-memory gdy RPC niedostępny
- `getSitemapArticles(limit=5000)`
- `getTickerArticles(limit)`
- `getTagBySlug`, `getArticlesByTag(slug, limit=50)`, `getAllTags`
- `getAdjacentArticles(articleId, categoryId, publishedAt)` — `maybeSingle()` zamiast `.single()`

### Optymalizacje
- `attachTagsBatch()` — 1 query zamiast N+1
- RPC `popular_tags` — brak transferu całej tablicy `article_tags`
- Lazy client — import modułu nie wymaga env vars
- Wszystkie `single()` → `maybeSingle()` gdzie nie chcemy błędu na 0 rekordów

---

## 8. API endpoints

| Endpoint | Metoda | Auth | Rate limit | Uwagi |
|---|---|---|---|---|
| `/api/cron/generate` | GET + POST | Bearer CRON_SECRET (**fail-closed**) | brak | 300s timeout, 1-15 items, używany przez Vercel Cron (GET) |
| `/api/cron/seed` | POST + GET | Bearer CRON_SECRET (**fail-closed**) | brak | Ręczny seed dla pustego DB; GET zwraca metadata |
| `/api/newsletter` | POST | brak | 5/min/IP | Upsert do `newsletter_subscribers`; email length ≤ 254 |
| `/api/search` | GET | brak | 30/min/IP | Wrapper nad `searchArticles()`, query ≤ 100 znaków |

### Uwagi bezpieczeństwa
- `CRON_SECRET` **fail-closed**: `if (!cronSecret || ...)` — brak env = 401 zamiast otwartego endpointu
- Newsletter rate limit jest **per-instance** (in-memory Map) — docelowo Upstash Redis
- Search query cap na 100 znaków (DoS guard), zarówno w API jak i w input (`maxLength`)

---

## 9. Routing i strony

| Route | Typ | Revalidate | Uwagi |
|---|---|---|---|
| `/` | Server + `(home)` route group | 300s | Hero + featured + latest + category highlights + newsletter |
| `/article/[slug]` | Server + RSC | 60s | TOC, prose, share, adjacent, related |
| `/category/[slug]?page=N` | Server | 300s | **Offset-based pagination** (rel=prev/next, str. X/Y) |
| `/tag/[slug]` | Server | 300s | Limit 50 artykułów |
| `/search` | Client | - | Debounce 300ms, `maxLength=100` |
| `/about` | Server (static) | - | canonical: `/about` |
| `/privacy` | Server (static) | - | canonical: `/privacy` |
| `/feed.xml` | Route handler | 3600s | RSS 2.0 |
| `/sitemap.xml` | Metadata route | - | URL dla articles + categories + tags |
| `/robots.txt` | Metadata route | - | Allow all, disallow `/api/` `/admin/` |

### Dostępne skróty
- **Ctrl+K / Cmd+K** — otwiera `SearchModal` (toggle)
- **`/`** — otwiera `SearchModal` (z dowolnego miejsca, jeśli focus nie jest w input/textarea)

---

## 10. System komponentów

### Layout (`src/components/layout/`)

| Komponent | Typ | Odpowiedzialność |
|---|---|---|
| `Header` | client | Sticky nav, logo, search trigger (Ctrl+K listener), theme toggle, mobile drawer z kategoriami |
| `NewsTicker` | client | Marquee na WAAPI (Element.animate()) |
| `Footer` | server | Branding, kategorie, linki, newsletter |
| `NewsletterForm` | client | POST /api/newsletter, states idle/loading/success/error |
| `ScrollToTop` | client | Floating button + reset scroll na route change |
| `SearchModal` | client | `maxLength=100`; debounce 400ms |
| `ThemeToggle` | client | `useSyncExternalStore` + MutationObserver na `html.class` |

### Artykuły (`src/components/articles/`)

| Komponent | Typ | Uwagi |
|---|---|---|
| `ArticleCard` | server | 3 warianty: default / featured / compact |
| `Breadcrumbs` | server | + JSON-LD `BreadcrumbList` (przez `jsonLdScript`) |
| `CategoryBar` | client | Scroll pos w sessionStorage |
| `ReadingProgress` | client | `role="progressbar"`, fixed top |
| `ShareButtons` | client | X / LinkedIn / Facebook + copy + `navigator.share` |
| `TableOfContents` | client | Używa `slugifyHeading` — spójne z renderowaniem nagłówków |

### UI (shadcn/ui `src/components/ui/`)
Button, Card, Dialog, Sheet, Input, InputGroup, Textarea, Badge, Avatar, Breadcrumb, **Pagination** (offset-based), Skeleton, ScrollArea, DropdownMenu, NavigationMenu, Separator, EmptyState.

**Usunięte**: `command.tsx` (cmdk) i `sonner.tsx` (toast) — zdezinstalowane z `package.json`.

---

## 11. Design system i style

### Tailwind 4 (nowa składnia)

- `globals.css` — `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`, `@utility`, `@layer base`
- Brak `tailwind.config.js` (Tailwind 4 nie wymaga)
- `postcss.config.mjs` → `@tailwindcss/postcss`

### Paleta (OKLCH)
- Light: neutral-navy foreground, purple primary
- Dark: deep navy background, luminous purple accents

### Typografia
- Heading: Plus Jakarta Sans (500/600/700/800)
- Body: Inter
- Mono: JetBrains Mono (400/500/600)
- `.prose-article` — klasa własna z `scroll-margin-top: 5rem` na h2/h3

### Animacje
- `tw-animate-css` + `.animate-fade-in-up`, `.stagger-{1..6}`
- `prefers-reduced-motion` respected

### Motyw
- Skrypt inline w `<head>` — zapobiega flash (odczyt z localStorage + prefers-color-scheme)

---

## 12. SEO

### Co jest

- ✅ Metadata API Next.js (title template, OG, Twitter, canonical per-page)
- ✅ JSON-LD: `Organization` (layout), `WebSite` z SearchAction (home), `NewsArticle` (single), `BreadcrumbList` (breadcrumbs), `CollectionPage`+`ItemList` (tag), `ItemList` (category) — **wszystko przez `jsonLdScript()` z escape'em `<>&U+2028/U+2029`**
- ✅ Sitemap z priorytetami
- ✅ RSS 2.0 feed (z poprawnym escape'em)
- ✅ Metadata base + lang=pl, locale=pl_PL
- ✅ Open Graph images z fallback
- ✅ `rel="nofollow noopener noreferrer"` na share links
- ✅ Reading time + structured data
- ✅ 404 strona
- ✅ **Heading anchor IDs zachowują polskie diakrytyki** (`ą→a`, `ł→l`…) przez `slugifyHeading()` (NFD + combining marks strip), spójnie w markdown rendererze i TOC
- ✅ **Pagination `rel=prev/next`** na `/category/[slug]`
- ✅ **Slugi artykułów** — buildUniqueSlug próbuje człowieczego slugu (retry z `-2`, `-3`…), dopiero przy wyczerpaniu używa timestampu

### Czego brakuje / co jest zepsute

- 🔴 **Canonical URL mismatch www vs non-www** — `siteConfig.url = NEXT_PUBLIC_SITE_URL || "https://aifeed.pl"`; jeśli env unset w Vercel, canonicals idą na non-www podczas gdy ruch jest na www. **Fix operacyjny:** `vercel env add NEXT_PUBLIC_SITE_URL https://www.aifeed.pl` (All Environments).
- 🟡 **Angielskie route'y** dla polskiej strony (`/article/`, `/category/`, `/search/`, `/about`, `/privacy`) — SEO pod polski rynek. Nie zrobione — duży refactor (zmiana katalogów + redirect 301).
- 🟡 **Placeholder `twitter`/`github`** w `siteConfig.links` — używane w `sameAs` w JSON-LD Organization, jeśli konta nie istnieją → niepoprawna karta. Wymaga decyzji biznesowej.

---

## 13. Bezpieczeństwo

### Pozytywy
- RLS włączony na wszystkich tabelach
- Anon key w kodzie klienta — poprawne (RLS chroni)
- Service role key tylko server-side (admin.ts, cron, newsletter POST)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control, **Strict-Transport-Security (HSTS)**
- Rate limit na newsletter (5/min) i search (30/min)
- Input validation email (regex + length ≤ 254)
- **Cron auth fail-closed** — brak `CRON_SECRET` zwraca 401 (nie bypass)
- External links na share mają `rel="nofollow noopener noreferrer"`
- **JSON-LD eskapuje `<`, `>`, `&` i U+2028/U+2029** — niemożliwe uciekanie przez `</script>` w tytule
- **SSRF hardening w scraperze** — `new URL(url)` + allowlist protokołu + blacklist hostów (localhost, RFC1918, link-local, IPv6 loopback/ULA)
- **Search query cap (100 znaków)** — DoS guard w API + `maxLength` w input

### Do zrobienia
- 🟡 **CSP header** — defense-in-depth poza JSON-LD escape
- 🟡 **Rate limit in-memory** — nie działa multi-region (docelowo Upstash Redis)

---

## 14. Wydajność

### Dobre praktyki
- React Compiler ON — auto-memoizacja
- Next.js Image z `sizes` i `priority` na hero
- ISR `revalidate: 60-3600s` per route
- `attachTagsBatch` eliminuje N+1
- `Promise.all` w kilku miejscach
- **Lazy Supabase client** — import modułu nie łączy się natychmiast
- **Bounded queries** — `getArticlesByCategory` (limit 50), `getArticlesGroupedByCategory` (max 200 lub N×10), `getArticlesByTag` (limit 50)
- **RPC `popular_tags`** — GROUP BY w PostgreSQL zamiast pobierania całego `article_tags`
- `@vercel/analytics` + GA — real user metrics

### Miejsca na dalszą optymalizację
- 🟡 `ReadingProgress` i `ScrollToTop` — 2 osobne scroll listenery (można scalić)
- 🟡 Brak prefetch wyselekcjonowanych linków w hero, brak preload obrazów
- 🟡 Brak `@vercel/speed-insights` (Analytics jest; Speed Insights osobno) — opcjonalne

---

## 15. Testy

### Co jest (`vitest run` — **28 testów passed**)
- `src/lib/data.test.ts` — testy `escapeIlike`, `sanitizeOrQuery`, `pluralize` — **importują rzeczywisty kod** z `src/lib/search-utils.ts`
- `src/lib/rate-limit.test.ts` — 4 testy `rateLimit()`
- `src/components/ui/empty-state.test.tsx` — RTL testy
- `src/config/site.test.ts`

### Do zrobienia
- 🟡 Testy integracyjne pipeline'u (`parser.ts`, `writer.ts`, `quality.ts`, `content.ts`, `generator.ts`)
- 🟡 Testy komponentów (ArticleCard, Header, NewsTicker, TOC, ShareButtons, NewsletterForm)
- 🟡 Testy API routes (`/api/newsletter`, `/api/search`, `/api/cron/*`)
- 🟡 E2E (Playwright/Cypress)

---

## 16. Konfiguracja i środowisko

### Zmienne środowiskowe

| Zmienna | Cel | Gdzie |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS-protected) | Vercel + .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (bypass RLS) | Vercel (secure) |
| `OPENROUTER_API_KEY` | OpenRouter API | Vercel (secure) |
| `CRON_SECRET` | Bearer dla cron auth — **obowiązkowy** (fail-closed) | Vercel (secure) |
| `NEXT_PUBLIC_SITE_URL` | Used by siteConfig. Produkcja: `https://www.aifeed.pl`. Dev: `http://localhost:3000`. | Vercel + .env.local |

`.env.example` zawiera komentarz o wymaganiu wariantu www na produkcji.

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/generate?count=10", "schedule": "0 5 * * *" },
    { "path": "/api/cron/generate?count=5",  "schedule": "0 11 * * *" },
    { "path": "/api/cron/generate?count=5",  "schedule": "0 17 * * *" }
  ]
}
```

### `next.config.ts`
- `reactCompiler: true` ✅
- `images.remotePatterns` — wildcard na HTTPS (pipeline scrape'uje z różnych domen)

### `src/proxy.ts` (dawniej `middleware.ts`)

Next.js 16 przemianował `middleware` na `proxy`. Eksportowana funkcja nazywa się `proxy`, konfiguracja matchera bez zmian. Security headers (w tym HSTS) ustawiane dla wszystkich ścieżek poza statycznymi assetami. API routes są świadomie w zakresie — korzystają z tych samych nagłówków.

---

## 17. Wdrożenie i deployment

### Aktywna infrastruktura
- **Vercel Project**: `aifeed-pl` (id: `prj_rmKqGPpHZ6crRr7wTbYhGTO1tNRS`)
- **Team**: `m-zeprzalkas-projects`
- **Domeny**: `aifeed.pl`, `www.aifeed.pl` (aliasy)
- **Cron**: 3×/dzień (5:00, 11:00, 17:00 UTC)
- **Node runtime**: 24.x

### Lokalna weryfikacja

```bash
npm run lint        # 0 errors, 0 warnings
npx tsc --noEmit    # exit 0
npm test            # 28/28 passing
npm run build       # Turbopack, bez deprecation warnings
```

---

## 18. ✅ ZREALIZOWANE POPRAWKI

Poprawki zaimplementowane w tej rewizji (wszystkie krytyczne z pierwotnego raportu + higiena kodu i typechecka):

### Bezpieczeństwo (P0/P1)
- **§18.1 Fail-open cron auth → fail-closed.** `/api/cron/generate` i `/api/cron/seed`: warunek zmieniony z `if (cronSecret && ...)` na `if (!cronSecret || ...)`. Brak env = 401, nie otwarty endpoint.
- **§18.15 JSON-LD `</script>` escape.** Nowy helper `src/lib/jsonld.ts` → `jsonLdScript()` eskapuje `<`, `>`, `&`, U+2028, U+2029. Podstawiony w `layout.tsx`, `(home)/page.tsx`, `article/[slug]/page.tsx`, `category/[slug]/page.tsx`, `tag/[slug]/page.tsx`, `components/articles/breadcrumbs.tsx`.
- **§18.24 SSRF hardening.** `scrapeArticleContent()` przed fetch: `new URL(url)`, wymusza `http(s):`, blokuje localhost / RFC1918 / link-local / IPv6 loopback/ULA.
- **§18.12 Search DoS guard.** `SEARCH_QUERY_MAX_LENGTH = 100` eksportowane z `search-utils.ts` i stosowane w `/api/search`, `/search/page.tsx`, `SearchModal`.
- **§18.5 `searchArticles` escape.** Nowa funkcja `sanitizeOrQuery()` — escape `%_\` + strip `,()` (syntax chars PostgREST `.or()`).
- **HSTS header** dodany w `proxy.ts` (`max-age=63072000; includeSubDomains; preload`).

### Schema / Dane (P0/P1)
- **§18.2 `newsletter_subscribers` w schema.sql.** Tabela z UNIQUE email + RLS bez publicznej policy (admin-only).
- **§18.6 Lazy Supabase client.** `data.ts` — zamiast singletonu na top-level mamy funkcję `db()` konstruującą client przy pierwszym użyciu. Import modułu nie wymaga env vars.
- **§18.8 Limit w `getArticlesByCategory`.** Domyślny limit 50 zamiast zwracania wszystkiego. To samo dla `getArticlesByTag`.
- **§18.9 `getPopularTags` jako RPC.** Nowa funkcja SQL `popular_tags(tag_limit)` z GROUP BY. Fallback in-memory jeśli RPC niedostępne.
- **§18.23 `maybeSingle()` zamiast `.single()`** w `getArticleBySlug`, `getCategoryBySlug`, `getTagBySlug`, `getAdjacentArticles`, lookup kategorii w cron/generate.
- **Bounded pull w `getArticlesGroupedByCategory`** — max 200 lub N×10×limitPerCategory (było: pełny select).

### SEO / UX (P1/P2)
- **§18.31 Polska diakrytyka w heading IDs.** Nowy `src/lib/heading-id.ts` → `slugifyHeading()` (NFD + combining mark strip + `ł→l`). Użyty **identycznie** w markdown rendererze (`article/[slug]/page.tsx`) i TOC (`table-of-contents.tsx`) — kotwice działają.
- **§18.11 Offset-based pagination.** `getArticlesByCategoryPaginated(slug, pageSize, page)` zwraca `{page, totalPages, total, hasPrev, hasNext}`. `Pagination` UI linkuje do `?page=N`, "Nowsze" cofa o jedną stronę zamiast do `page=1`. Dodano `rel=prev/next`.
- **§18.18 Ctrl+K dla SearchModal.** Handler w `Header`: `Cmd/Ctrl+K` toggluje modal, `/` otwiera (gdy focus nie jest w input/textarea).
- **§18.30 Czystsze slugi artykułów.** `buildUniqueSlug()` w cron/generate: próbuje czystego slugu, przy kolizji dokleja `-2`, `-3`, …; dopiero w skrajnym przypadku używa timestampu.

### Pipeline observability (P2)
- **§18.26 `failed[]` w response pipeline'u.** `/api/cron/generate` teraz zwraca `{generated, rejected, failed: [{title, reason}], scraped, new}`. Powody: `source-too-short`, `ai-refusal`, `insert-failed: ...`, raw error.

### Testy (P0)
- **§18.4 `data.test.ts` testuje rzeczywisty kod.** Wspólne helpery wyciągnięte do `src/lib/search-utils.ts` (`escapeIlike`, `sanitizeOrQuery`, `pluralize`, `SEARCH_QUERY_MAX_LENGTH`). Testy importują eksport, nie kopię funkcji. Dodane testy dla `sanitizeOrQuery`. **28/28 passing.**

### Cleanup (P2)
- **§18.16 Komentarz w matcherze poprawiony.** Komentarz wyjaśnia że API routes są celowo w zakresie, plus rename na `proxy.ts` (Next.js 16 migration).
- **§18.17 Nieużywane pliki i deps.**
  - `sonner` i `cmdk` — usunięte z `package.json`
  - `src/components/ui/sonner.tsx` i `src/components/ui/command.tsx` — skasowane
  - `src/lib/supabase/client.ts` i `src/lib/supabase/server.ts` — skasowane (tylko `admin.ts` pozostaje, używane przez cron i newsletter)
- **§18.29 `src/app/examples/` → `docs/examples/`.** 5 mockupów HTML wyjętych z App Router (nie są publicznie dostępne).
- **Next.js 16 migration.** `middleware.ts` → `proxy.ts`, funkcja `middleware()` → `proxy()`. Build bez deprecation warnings.
- **`getArticleThumbnail(title, sourceUrl)`** — usunięty nieużywany trzeci argument, zaktualizowane callers.
- **Lint czysty** — 0 errors, 0 warnings (`react/no-unescaped-entities` w SearchModal oraz unused vars w middleware/generator naprawione).

### Instrumentacja
- **@vercel/analytics** — już w dependencies, dodane `<Analytics />` do root layout (obok GoogleAnalytics).

### Dokumentacja / konfiguracja
- **§18.27 `.env.example`** — dodany komentarz o wariancie `https://www.aifeed.pl` dla produkcji (wyjaśnia §18.3).
- **Schema.sql** — RPC `popular_tags` i tabela `newsletter_subscribers` dopisane (DB wymaga redeployu przez SQL Editor, zob. §19).

---

## 19. 🎯 POZOSTAŁY BACKLOG

Punkty z pierwotnego raportu, które wymagają decyzji operacyjnych (poza kodem) lub są odkładalne:

### Wymaga akcji operacyjnej (Vercel dashboard)
- **§18.3** — `vercel env add NEXT_PUBLIC_SITE_URL https://www.aifeed.pl` (All Environments). Bez tego canonicals wskazują na non-www a ruch idzie na www.
- **§18.20** — usunąć martwy projekt `aifeed` (nie `aifeed-pl`) z dashboardu Vercel.
- **Rotacja kluczy** — `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (standardowa higiena).
- **Deploy RPC `popular_tags`** — uruchomić aktualne `supabase/schema.sql` w SQL Editor, żeby `getPopularTags` przestał spadać do in-memory aggregate.

### Duże refaktory odłożone
- **§18.14 Polonizacja URL-i** (`/artykul/`, `/kategoria/`, `/szukaj`, `/o-serwisie`, `/polityka-prywatnosci`) — wymaga zmiany katalogów + search&replace + redirect 301 w `next.config.ts`. Największy pojedynczy SEO-boost, ale to dzień pracy plus testy.
- **§18.10 Rate limit multi-region** — przejście na Upstash Redis przez Vercel Marketplace. Obecny in-memory Map wystarcza przy małym ruchu, ale nie skaluje poprawnie.
- **Testy integracyjne / E2E** — `parser.ts`, `writer.ts::extractMeta`, `quality.ts`, `content.ts`, API routes, E2E z Playwright.
- **CSP header** — wymaga zdefiniowania nonce + inventory zewnętrznych domen (GA, Vercel Analytics, Supabase, OpenRouter obrazy).

### Polish / drobne
- **§18.7 Quality gate kalibracja** — "soft warnings" dla score 40-60.
- **§18.13 `siteConfig.links`** — decyzja czy usunąć `twitter`/`github` z `sameAs`, czy założyć konta.
- **§18.19 `vercel.ts` zamiast `vercel.json`** — opcjonalne, JSON nadal wspierany.
- **§18.21 Polskie źródła RSS** — Spider's Web / AntyWeb mają dużo szumu; filtr AI mitiguje, ale można poszukać bardziej celowanych feedów.
- **§18.22 NewsTicker fonts race** — `document.fonts.ready` + ResizeObserver.
- **§18.28 Ujednolicone error handling** — wspólny helper `handleQuery<T>(result, fallback)` w `data.ts`.
- **§18.32 Per-source cap RSS** — bez priorytetyzacji nowych itemów (dedup w cron działa, ale okazjonalnie gubi itemy).

---

## PODSUMOWANIE TEJ REWIZJI

Naprawione **wszystkie cztery P0** z pierwotnego raportu (fail-open cron, brak tabeli newsletter, testy nic-nie-testujące, eskpae JSON-LD) plus cały stos P1/P2, który dało się zamknąć kodem bez zmian operacyjnych.

**Build, lint i testy są czyste:**
- `npm run lint` — 0 problems
- `npx tsc --noEmit` — exit 0
- `npm test` — 28/28 passing (o 3 więcej niż przed rewizją)
- `npm run build` — brak ostrzeżeń deprecation (migracja `middleware` → `proxy` wykonana)

**Pozostały backlog** to głównie rzeczy operacyjne (Vercel dashboard env vars, rotacja kluczy, deploy RPC) i decyzje biznesowe (polonizacja URL, Upstash Redis, E2E).

---

*Wygenerowane automatycznie przez Claude Opus 4.7 · 2026-04-21*
