# AiFeed — Dokumentacja Projektu

> Stan na: **2026-04-21**
> Wersja: 0.1.0

---

## Spis treści

1. [Czym jest AiFeed](#1-czym-jest-aifeed)
2. [Architektura](#2-architektura)
3. [Stack technologiczny](#3-stack-technologiczny)
4. [Struktura repozytorium](#4-struktura-repozytorium)
5. [Baza danych (Supabase)](#5-baza-danych-supabase)
6. [Pipeline AI](#6-pipeline-ai)
7. [Warstwa danych](#7-warstwa-danych)
8. [API endpoints](#8-api-endpoints)
9. [Routing i strony](#9-routing-i-strony)
10. [System komponentów](#10-system-komponentów)
11. [Design system i style](#11-design-system-i-style)
12. [SEO](#12-seo)
13. [Bezpieczeństwo](#13-bezpieczeństwo)
14. [Wydajność](#14-wydajność)
15. [Testy](#15-testy)
16. [Konfiguracja i środowisko](#16-konfiguracja-i-środowisko)
17. [Wdrożenie i deployment](#17-wdrożenie-i-deployment)
18. [🎯 Do zrobienia](#18-do-zrobienia)

---

## 1. Czym jest AiFeed

**AiFeed** to polskojęzyczny, w pełni zautomatyzowany magazyn informacyjny o AI. Serwis sam:

1. **Scrape'uje** 20 źródeł RSS (branżowe magazyny, blogi firm AI, arXiv, polskie portale tech)
2. **Selekcjonuje** najlepsze artykuły przez scoring (świeżość + dywersyfikacja źródeł)
3. **Pobiera pełną treść** ze strony źródłowej (scraping HTML z walidacją hosta anti-SSRF)
4. **Generuje** po polsku kompletny artykuł przez OpenRouter (Claude Sonnet 4)
5. **Ocenia jakość** (quality gate 0-100, próg 50)
6. **Dobiera miniaturkę** — najpierw `og:image` ze źródła, w razie braku Gemini 2.5 Flash Image
7. **Zapisuje** do Supabase z tagami, kategorią, linkami zwrotnymi
8. **Publikuje** natychmiast — brak ingerencji człowieka

Pipeline leci w Vercel Cron 3× dziennie (5:00, 11:00, 17:00 UTC — konfiguracja w `vercel.json`).

**Produkcja:** `https://aifeed.pl` i `https://www.aifeed.pl` (aliasy na projekt Vercel `aifeed-pl`).

---

## 2. Architektura

```
                   ┌───────────────────────┐
                   │  Vercel Cron (3×/dzień) │
                   └───────────┬───────────┘
                               ▼
        ┌──────────────────────────────────────────┐
        │  /api/cron/generate  (maxDuration=300s)  │
        │  Bearer CRON_SECRET (fail-closed)        │
        │  ─────────────────────────────────────── │
        │  1. scrapeAllFeeds()          20 feedów   │
        │  2. dedupe vs scraped_items                │
        │  3. selectTopArticles()    (greedy score) │
        │  4. for each top item:                     │
        │     ├─ scrapeArticleContent() + SSRF guard │
        │     ├─ generateArticle()  (Claude Sonnet 4)│
        │     ├─ assessArticleQuality() ≥ 50         │
        │     ├─ getArticleThumbnail()  og:image→AI  │
        │     ├─ buildUniqueSlug()  human-readable   │
        │     ├─ insert articles                     │
        │     └─ upsert tags + article_tags          │
        │  returns {generated, rejected, failed}     │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Supabase (PostgreSQL + Storage)          │
        │  articles · categories · tags ·           │
        │  article_tags · scraped_items ·           │
        │  newsletter_subscribers                   │
        │  RPC: popular_tags(tag_limit)             │
        │  Storage bucket: thumbnails               │
        └──────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  Next.js 16 App Router (RSC + ISR)        │
        │  /                       → home           │
        │  /artykul/[slug]         → post           │
        │  /kategoria/[slug]?page=N → category list │
        │  /tag/[slug]             → tag list       │
        │  /szukaj                 → client search  │
        │  /o-serwisie                              │
        │  /polityka-prywatnosci                    │
        │  /sitemap.xml /robots.txt /feed.xml       │
        └──────────────────────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │        Czytelnik       │
                   └───────────────────────┘
```

### Warstwy

- **Edge (proxy)** — `src/proxy.ts`, nagłówki bezpieczeństwa dla wszystkich tras (Next.js 16 konwencja — dawniej `middleware.ts`)
- **Server (RSC)** — strony i route handlery; dostęp do Supabase przez **anon key** + RLS
- **Client components** — wyłącznie interaktywne (`"use client"`): Header, SearchModal, NewsTicker, ThemeToggle, NewsletterForm, ReadingProgress, TableOfContents, CategoryBar, ShareButtons, ScrollToTop, SearchPage
- **Admin client** — `createAdminClient()` (service role) omija RLS; używany wyłącznie w pipeline (`/api/cron/*`) i zapisie do `newsletter_subscribers`

---

## 3. Stack technologiczny

### Core
- **Next.js 16.2.3** (App Router, React Compiler, Turbopack, `proxy.ts` zamiast `middleware.ts`)
- **React 19.2.4** (RSC + `useSyncExternalStore`, `useMemo`, `useCallback`)
- **TypeScript 5** — strict mode
- **Node 24.x** — Vercel runtime

### Dane
- **Supabase** (`@supabase/supabase-js` 2.103 + `@supabase/ssr` 0.10)
- **PostgreSQL** — tabele `articles`, `categories`, `tags`, `article_tags`, `scraped_items`, `newsletter_subscribers`
- **Supabase RPC** — `popular_tags(tag_limit)` (server-side GROUP BY)
- **Supabase Storage** — bucket `thumbnails` dla AI-generowanych obrazów

### AI
- **OpenRouter** — `anthropic/claude-sonnet-4` (artykuły) + `google/gemini-2.5-flash-image` (miniaturki)

### UI
- **shadcn/ui 4.2** zbudowany na `@base-ui/react` 1.3 (**nie** klasyczne Radix)
- **Tailwind CSS 4** — nowa składnia (`@theme`, `@custom-variant`, `@utility`), bez `tailwind.config.js`
- **lucide-react** — ikony
- **next-themes** — motyw jasny/ciemny
- **tw-animate-css** — animacje
- **react-markdown 10** + `remark-gfm 4` — renderowanie treści

### Observability
- **@vercel/analytics** + **@next/third-parties** (Google Analytics, gaId `G-5SD17PTF0C`)

### Testing
- **Vitest 4** + `@testing-library/react` 16 + `jsdom` 29 — **28 testów passing**

---

## 4. Struktura repozytorium

```
aifeed/
├── .vercel/project.json
├── vercel.json                   # cron 3×/dzień
├── next.config.ts                # reactCompiler + image remotePatterns
├── tsconfig.json
├── vitest.config.ts
├── postcss.config.mjs
├── components.json               # shadcn/ui config
├── eslint.config.mjs
├── .env.example                  # wszystkie wymagane zmienne z komentarzami
├── AGENTS.md + CLAUDE.md         # instrukcje dla AI asystentów
│
├── docs/
│   └── examples/                 # 5 mockupów HTML (poza App Router)
│
├── supabase/
│   ├── schema.sql                # pełny schemat (tabele + RLS + RPC + seed)
│   └── migrations/
│       └── 001_newsletter_and_popular_tags.sql  # wydzielona migracja idempotentna
│
├── public/                       # favicon, icons, og-image
│
└── src/
    ├── proxy.ts                  # security headers (X-Frame, HSTS, ...)
    │
    ├── app/
    │   ├── layout.tsx            # Header + NewsTicker + Footer + JSON-LD + Analytics
    │   ├── globals.css           # Tailwind 4 @theme + prose-article + animacje
    │   ├── manifest.ts           # PWA manifest (lang: pl)
    │   ├── robots.ts
    │   ├── sitemap.ts
    │   ├── not-found.tsx
    │   ├── feed.xml/route.ts     # RSS 2.0 z escape XML
    │   │
    │   ├── (home)/
    │   │   ├── loading.tsx
    │   │   └── page.tsx          # hero + latest + category highlights + newsletter
    │   ├── o-serwisie/page.tsx
    │   ├── polityka-prywatnosci/page.tsx
    │   ├── szukaj/
    │   │   ├── layout.tsx        # metadata { robots: noindex } + canonical
    │   │   ├── loading.tsx
    │   │   └── page.tsx          # client, debounce 300ms, maxLength 100
    │   │
    │   ├── artykul/[slug]/
    │   │   ├── page.tsx          # breadcrumbs + TOC + prose + share + adjacent + related
    │   │   ├── loading.tsx
    │   │   └── error.tsx
    │   ├── kategoria/[slug]/
    │   │   ├── page.tsx          # offset-based pagination ?page=N
    │   │   └── loading.tsx
    │   ├── tag/[slug]/
    │   │   ├── page.tsx
    │   │   └── loading.tsx
    │   │
    │   └── api/
    │       ├── cron/
    │       │   ├── generate/route.ts   # pipeline
    │       │   └── seed/route.ts       # manualny seed kategorii
    │       ├── newsletter/route.ts     # 5/min/IP, email ≤ 254 znaków
    │       └── search/route.ts         # 30/min/IP, query ≤ 100 znaków
    │
    ├── components/
    │   ├── layout/   (7 plików)  # Header, Footer, NewsTicker, NewsletterForm,
    │   │                         #   ScrollToTop, SearchModal, ThemeToggle
    │   ├── articles/ (6 plików)  # ArticleCard, Breadcrumbs, CategoryBar,
    │   │                         #   ReadingProgress, ShareButtons, TableOfContents
    │   └── ui/      (17 plików)  # shadcn: Button, Card, Dialog, Sheet, Input,
    │                             #   Pagination, Skeleton, ScrollArea, EmptyState, ...
    │
    ├── config/
    │   ├── site.ts               # siteConfig (URL, kategorie, links)
    │   └── site.test.ts
    │
    ├── lib/
    │   ├── data.ts               # read-only queries (anon key, lazy client)
    │   ├── data.test.ts          # testy importują rzeczywisty kod z search-utils
    │   ├── search-utils.ts       # escapeIlike, sanitizeOrQuery, pluralize, MAX_LEN
    │   ├── heading-id.ts         # slugifyHeading — diakrytyka-aware
    │   ├── jsonld.ts             # jsonLdScript — escape </script>
    │   ├── rate-limit.ts         # in-memory sliding window
    │   ├── rate-limit.test.ts
    │   ├── utils.ts              # cn()
    │   ├── hooks/
    │   │   └── use-scroll-y.ts   # shared window.scrollY subscription (useSyncExternalStore)
    │   │
    │   ├── ai/
    │   │   ├── prompts.ts        # ARTICLE_SYSTEM_PROMPT + USER_PROMPT
    │   │   ├── writer.ts         # generateArticle() + META extractor
    │   │   └── quality.ts        # assessArticleQuality() — 0-100 + issues[]
    │   │
    │   ├── scraper/
    │   │   ├── sources.ts        # RSS_SOURCES (20 feedów)
    │   │   ├── parser.ts         # scrapeAllFeeds + selectTopArticles
    │   │   └── content.ts        # scrapeArticleContent + isInternalHost guard
    │   │
    │   ├── images/
    │   │   └── generator.ts      # og:image → AI → Supabase Storage
    │   │
    │   └── supabase/
    │       └── admin.ts          # createAdminClient (service role)
    │
    ├── test/setup.ts             # @testing-library/jest-dom
    └── types/database.ts         # TS types dla tabel
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
| `scraped_items` | id, source_url (UNIQUE), title, description, source_name, is_processed | Cache dedup pipeline'u |
| `newsletter_subscribers` | id, email (UNIQUE), subscribed_at, unsubscribed_at | Zapis/odczyt wyłącznie service role (brak public policy) |

### Indeksy
- `idx_articles_slug`
- `idx_articles_published (is_published, published_at DESC)`
- `idx_articles_category`
- `idx_articles_featured (is_featured, published_at DESC)`
- `idx_scraped_items_url`

### RLS policies
- `articles` — public SELECT gdzie `is_published = true`
- `categories`, `tags`, `article_tags` — public SELECT (bez filtrów)
- `scraped_items`, `newsletter_subscribers` — brak publicznej policy; dostęp wyłącznie przez service role (admin client)

### RPC
- `popular_tags(tag_limit INT) → (id, name, slug, count)` — server-side `GROUP BY tag_id ORDER BY count DESC`, używany przez `getPopularTags()`

### Storage
- Bucket `thumbnails` — public, `fileSizeLimit: 10 MB`, tworzony idempotentnie w `uploadToStorage()` (ignore "already exists")

---

## 6. Pipeline AI

### `scrapeAllFeeds()` — `src/lib/scraper/parser.ts`

- Parsuje 20 feedów RSS równolegle (`Promise.allSettled`)
- Max 10 itemów per feed (`rss-parser`, timeout 10s, User-Agent: `AiFeed/1.0`)
- **Filtr AI-relevance** — whitelist słów kluczowych (`ai`, `llm`, `gpt`, `claude`, `gemini`, `neural`, `deep learning`, `transformer`, `openai`, `anthropic`, `reasoning`, `agentic`, …) lub zawsze-relewantne źródła (Blog firmowy / DeepMind / Hugging Face / Anthropic / arXiv)
- Deduplikacja po URL, sort najnowsze pierwsze

### `selectTopArticles(articles, count)` — greedy scoring

```
score = freshnessScore − diversityPenalty
freshnessScore = max(0, 100 − hoursOld × 2)
diversityPenalty = sourceCount[source] × 20
```

Iteracyjnie wybiera top-scoring artykuł, karząc kolejne pod tym samym źródłem.

### `scrapeArticleContent(url)` — `src/lib/scraper/content.ts`

**Walidacja URL (anti-SSRF) przed fetch:**
1. `new URL(url)` (rzuca → odrzuć)
2. Wymaga `http:` lub `https:`
3. `isInternalHost()` blokuje: `localhost`/`*.localhost`, `0.0.0.0`, `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.0.0/16` (AWS metadata), IPv6 loopback `::1`, IPv6 ULA `fc::/7`, `fd::/7`

**Ekstrakcja treści:**
1. Fetch (User-Agent Chrome 120, timeout 15s, follow redirects)
2. Wymaga `text/html` lub `application/xhtml` (reject PDF/images/binary)
3. Strip `<script>`, `<style>`, `<noscript>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<svg>`, `<iframe>`, komentarze
4. Priorytet DOM: `<article>` > `<main>` > `<body>`
5. HTML → plain text z dekodowaniem encji (`&nbsp;`, `&amp;`, smart quotes, em/en dashes)
6. Truncate do 6000 znaków
7. Odrzuca <100 znaków lub gdy ratio `printable/total < 0.7`

### `generateArticle()` — `src/lib/ai/writer.ts`

- Model: `anthropic/claude-sonnet-4` via OpenRouter
- `max_tokens: 4096`, timeout 90s
- System prompt narzuca: wierność źródłu, polski dziennikarski, 600-1200 słów, obowiązkowa sekcja `## Kluczowe wnioski`, zakaz halucynacji
- Output split: treść + META (JSON) rozdzielone `---META---`
- `extractMeta()` ma **3 strategie fallback** dla META JSON:
  1. Delimiter `---META---` (case-insensitive regex)
  2. Pattern-match `{..."title"...}` — ostatni JSON blok
  3. Fix trailing commas + smart quotes → straight
- Loguje użycie tokenów i koszt z `data.usage`

### `assessArticleQuality()` — `src/lib/ai/quality.ts`

| Check | Kara |
|---|---|
| Brak sekcji `## Kluczowe wnioski` | −15 |
| Brak linku markdown do źródła | −25 |
| <100 słów | −35 |
| 100-199 słów | −20 |
| 0× `##` | −10 |
| Tytuł <15 znaków | −15 |
| Excerpt <50 znaków | −10 |
| <2 tagi | −5 |
| Nieznana kategoria | −10 |

Próg odrzucenia: score < 50.

### `getArticleThumbnail(title, sourceUrl)` — `src/lib/images/generator.ts`

1. **`scrapeOgImage()`** — scrape `og:image` (oba porządki atrybutów), resolve relative URL, HEAD check (`image/*`, size > 5 KB aby pominąć tracking pixele), wydobycie `og:site_name` dla atrybucji
2. **`generateAIImage()`** — fallback na Gemini 2.5 Flash Image przez OpenRouter, prompt "professional editorial illustration, 16:9, no text/logos", timeout 90s
3. **`uploadToStorage()`** — upload base64 (PNG/JPEG/WebP) do bucket `thumbnails`, plik `ai-{timestamp}.{ext}`, zwraca public URL
4. Wszystkie metody zawiodły → `{ url: "", source: null }` (UI pokazuje gradient placeholder)

### Cały przepływ — `/api/cron/generate/route.ts`

```ts
1.  Bearer CRON_SECRET check → 401 jeśli brak/zły secret
2.  scrapedItems = scrapeAllFeeds()
3.  existingUrls = SELECT source_url FROM scraped_items WHERE source_url IN (...)
4.  newItems = scrapedItems.filter(url ∉ existingUrls)
5.  topItems = selectTopArticles(newItems, count)  // count ∈ [1,15] via ?count=N
6.  for each item:
    a. sourceContent = scrapeArticleContent(item.url)
    b. if content < 100 znaków → failed.push("source-too-short"), mark processed
    c. article = generateArticle(...)
    d. refusal patterns → failed.push("ai-refusal"), mark processed
    e. quality.score < 50 → rejected.push(title), mark processed
    f. thumbnail = getArticleThumbnail(title, url)
    g. slug = buildUniqueSlug(supabase, title)  // retry z -2, -3…, ostatecznie timestamp
    h. insert article (is_featured = pierwszy w tej serii)
    i. upsert tags + article_tags
    j. upsert scraped_items(is_processed=true)
7.  return { message, generated[], rejected[], failed[{title,reason}], scraped, new }
```

---

## 7. Warstwa danych

`src/lib/data.ts` — wszystkie zapytania read-only do DB dla frontu (anon key + RLS).

**Lazy singleton** — funkcja `db()` konstruuje klienta przy pierwszym wywołaniu; import modułu nie wymaga env vars.

### Funkcje

| Funkcja | Uwagi |
|---|---|
| `getArticles(limit = 10)` | najnowsze opublikowane |
| `getFeaturedArticles()` | `is_featured = true`, max 5 |
| `getArticleBySlug(slug)` | `maybeSingle()` |
| `getArticlesByCategory(slug, limit = 50)` | bounded limit |
| `getArticlesByCategoryPaginated(slug, pageSize, page)` | offset-based, zwraca `{articles, page, totalPages, total, pageSize, hasPrev, hasNext}` |
| `getCategories()`, `getCategoryBySlug(slug)` | `maybeSingle()` |
| `searchArticles(query)` | `sanitizeOrQuery` + `.or("title.ilike%…,excerpt.ilike%…")`, limit 20 |
| `getArticlesGroupedByCategory(slugs, limitPerCategory = 4)` | 1 query, bounded pull (`max(N × limit × 10, 200)`), in-memory grouping |
| `getPopularTags(limit = 10)` | **RPC `popular_tags`** z fallbackiem in-memory aggregate gdy RPC niedostępny |
| `getSitemapArticles(limit = 5000)` | slug + updated_at + is_featured |
| `getTickerArticles(limit = 10)` | title + slug |
| `getTagBySlug`, `getArticlesByTag(slug, limit = 50)`, `getAllTags` | |
| `getAdjacentArticles(articleId, categoryId, publishedAt)` | prev/next w tej samej kategorii, `maybeSingle()` |

### Optymalizacje
- `attachTagsBatch()` — 1 query dla wszystkich tagów (eliminacja N+1)
- `.maybeSingle()` wszędzie gdzie nie chcemy error na 0 rekordów
- `sanitizeOrQuery()` — escape `%_\` + strip `,()` (syntax chars PostgREST `.or()`)

---

## 8. API endpoints

| Endpoint | Metoda | Auth | Rate limit | Timeout | Uwagi |
|---|---|---|---|---|---|
| `/api/cron/generate` | GET, POST | Bearer `CRON_SECRET` (fail-closed) | — | 300s | `?count=N`, N ∈ [1, 15], default 10 |
| `/api/cron/seed` | GET, POST | Bearer `CRON_SECRET` (fail-closed) | — | 300s | `?category=slug`, `?limit=N`; GET zwraca metadata |
| `/api/newsletter` | POST | — | 5/min/IP | — | Email regex + length ≤ 254 → upsert `newsletter_subscribers` |
| `/api/search` | GET | — | 30/min/IP | — | Query ≤ 100 znaków, trim, pusty/za długi → `[]` |

### Uwagi
- `rateLimit()` (`src/lib/rate-limit.ts`) to in-memory sliding window z periodic cleanup (1 min). IP pochodzi z `x-forwarded-for` → `x-real-ip` → `"unknown"`.
- Cron auth: `if (!cronSecret || authHeader !== "Bearer " + cronSecret) return 401` — brak env = zamknięte.

---

## 9. Routing i strony

URL-e w 100% polskie — SEO pod polski rynek. Starsze angielskie ścieżki (`/article`, `/category`, `/search`, `/about`, `/privacy`) są przekierowywane **HTTP 301** w `next.config.ts::redirects()` (zachowuje link equity i boty Google).

| Route | Typ | Revalidate | Uwagi |
|---|---|---|---|
| `/` | Server, `(home)` route group | 300s | Hero + featured + latest (6 cards) + 4 sekcje kategorii (3 układy naprzemiennie) + newsletter + about/stats |
| `/artykul/[slug]` | Server | 60s | Breadcrumbs + TOC + prose-article + share + adjacent + related; `NewsArticle` JSON-LD |
| `/kategoria/[slug]?page=N` | Server | 300s | Offset-based pagination, `rel=prev/next`, `ItemList` JSON-LD |
| `/tag/[slug]` | Server | 300s | `CollectionPage` + `ItemList` JSON-LD, limit 50 |
| `/szukaj` | Client + `layout.tsx` z metadata | — | Debounce 300ms, `maxLength=100`, `?q=` initial. **Noindex** (`robots: index:false`), wyłączone z sitemap, disallowed w `robots.txt` — chroni SERP przed cienką treścią z `?q=…` |
| `/o-serwisie` | Server (static) | — | canonical `/o-serwisie` |
| `/polityka-prywatnosci` | Server (static) | — | canonical `/polityka-prywatnosci` |
| `/feed.xml` | Route handler | 3600s | RSS 2.0 z CDATA + escape XML + `<atom:link rel="self">` (linki artykułów `/artykul/[slug]`) |
| `/sitemap.xml` | Metadata route | — | Articles (priority 0.9/0.7) + categories (0.8) + tags (0.5) + `/`, `/o-serwisie`, `/polityka-prywatnosci` |
| `/robots.txt` | Metadata route | — | `Allow: /`, `Disallow: /api/`, `/admin/`, `/szukaj` |
| `/manifest.webmanifest` | Metadata route | — | PWA manifest, `lang: pl` |

### Przekierowania 301 (z angielskich URL-i)
```ts
// next.config.ts
async redirects() {
  return [
    { source: "/article/:slug",  destination: "/artykul/:slug",              permanent: true },
    { source: "/category/:slug", destination: "/kategoria/:slug",            permanent: true },
    { source: "/search",         destination: "/szukaj",                     permanent: true },
    { source: "/about",          destination: "/o-serwisie",                 permanent: true },
    { source: "/privacy",        destination: "/polityka-prywatnosci",       permanent: true },
  ];
}
```

### Skróty klawiszowe
- **Ctrl+K / Cmd+K** — toggle `SearchModal`
- **`/`** — otwiera `SearchModal` (jeśli fokus nie jest w `<input>`/`<textarea>`)

---

## 10. System komponentów

### Layout (`src/components/layout/`)

| Komponent | Typ | Odpowiedzialność |
|---|---|---|
| `Header` | client | Sticky nav, logo (klik na `/` → smooth scroll-to-top), search trigger, theme toggle, mobile drawer z `Wszystko` + kategoriami, Ctrl+K/`/` keyboard handler, `aria-current="page"` dla aktywnej trasy |
| `NewsTicker` | client | Marquee na WAAPI (`Element.animate()`). `memo` z compare po slugach + `ResizeObserver` + `document.fonts.ready` — nieprzerwany przy nawigacji, odporny na font swap |
| `Footer` | server | Branding, kategorie, linki, newsletter |
| `NewsletterForm` | client | POST /api/newsletter, states idle/loading/success/error |
| `ScrollToTop` | client | `useLayoutEffect` z `behavior: "instant"` na route change (bez flicker "w połowie → top"). Hash anchors pomijane. Floating button z `scrollTo({behavior: "smooth"})`. Widoczność przez wspólny `useScrollY()` — zamiast własnego `scroll` listenera |
| `SearchModal` | client | Debounce 400ms, abort-aware fetch, `maxLength=100` |
| `ThemeToggle` | client | `useSyncExternalStore` + MutationObserver na `html.class` |

### Artykuły (`src/components/articles/`)

| Komponent | Typ | Uwagi |
|---|---|---|
| `ArticleCard` | server | 3 warianty: `default` (`<h3>`) / `featured` (`<h2>`) / `compact` (`<h4>`) |
| `Breadcrumbs` | server | + `BreadcrumbList` JSON-LD (przez `jsonLdScript`) |
| `CategoryBar` | client | `<nav aria-label="Kategorie">` z `aria-current="page"` na aktywnym linku. Scroll position persist w sessionStorage. "Wszystko" aktywne gdy `pathname === "/"` |
| `ReadingProgress` | client | `role="progressbar"`, fixed top. Pozycja przez wspólny `useScrollY()`; wymiary artykułu mierzone raz + ResizeObserver; sam progres **derived state** w renderze (zgodne z React 19 `set-state-in-effect` rule) |
| `ShareButtons` | client | X / LinkedIn / Facebook + copy + `navigator.share` (progressive) |
| `TableOfContents` | client | Lista `#id` anchorów ze `slugifyHeading()` (ta sama funkcja co markdown renderer → spójne kotwice) |

### UI (shadcn/ui, `src/components/ui/`)
`Avatar`, `Badge`, `Breadcrumb`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `EmptyState`, `Input`, `InputGroup`, `NavigationMenu`, `Pagination`, `ScrollArea`, `Separator`, `Sheet`, `Skeleton`, `Textarea`.

`Pagination` — offset-based, linki `?page=N`, `rel=prev/next`, wyświetla `X artykułów · str. Y/Z`.

### Hooki współdzielone (`src/lib/hooks/`)
- **`useScrollY()`** — `useSyncExternalStore`-based shared subscription do `window.scroll`. Jeden globalny listener, N subskrybentów. SSR-safe (zwraca `0` na serwerze). Używany przez `ReadingProgress` i `ScrollToTop` — obie przedtem miały własne osobne listenery.

---

## 11. Design system i style

### Tailwind 4
- `globals.css`: `@import "tailwindcss"`, `@theme inline { --color-* }`, `@custom-variant dark (&:is(.dark *))`, `@utility`, `@layer base`
- Brak `tailwind.config.js` (niepotrzebny w v4)
- `postcss.config.mjs` → `@tailwindcss/postcss`

### Paleta (OKLCH)
- Light: neutral-navy foreground, purple primary
- Dark: deep navy background, luminous purple accents
- CSS custom props: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, …

### Typografia
- Heading: Plus Jakarta Sans (500/600/700/800)
- Body: Inter
- Mono: JetBrains Mono (400/500/600)
- `.prose-article` — własna klasa (**nie** `@tailwindcss/typography`) z `scroll-margin-top: 5rem` na h2/h3 (anchor scroll friendly)

### Animacje
- `tw-animate-css` + własne `.animate-fade-in-up`, `.stagger-{1..6}`
- `prefers-reduced-motion` respected w `globals.css`

### Motyw
- Inline script w `<head>` przed hydratacją — czyta localStorage + `prefers-color-scheme`, zapobiega flash unstyled

### Scroll behavior
- **Brak globalnego `scroll-behavior: smooth`** w `html` — animowany scroll przy nawigacji dawał efekt "lądujemy w połowie i animujemy do góry". Zostało tylko `scroll-padding-top: 5rem` (anchor offset pod sticky header).
- Programowy smooth scroll jest opt-in per-call: `ScrollToTop` button, logo klik na `/`.

---

## 12. SEO

### Metadata API (`src/app/*/page.tsx`)
- **Layout root** — title template (`%s | AiFeed`), locale `pl_PL`, `applicationName`, `authors`, `creator`, `publisher`, `category: technology`. `robots.googleBot` dopuszcza `max-image-preview: large`, `max-snippet: -1`. `formatDetection` blokuje auto-parsowanie telefonów/maili/adresów.
- **`/article/[slug]`** — generowane `openGraph` z `type: "article"`, `publishedTime`, `modifiedTime`, `section` (kategoria), `tags`, `authors`. OG images z jawnymi `width: 1200, height: 630, alt`. Twitter `summary_large_image` z `images`. `keywords` z tagów. `robots: index:false, follow:false` gdy artykuł nie znaleziony.
- **`/category/[slug]`, `/tag/[slug]`** — pełne `openGraph` + `twitter`, `canonical`, `robots: noindex` gdy brak wpisu.
- **`/search`** — dedicated `layout.tsx` z `robots: index:false, follow:true`. Wyłączone z sitemap, disallowed w `robots.txt`.
- **`/not-found`** — `robots: index:false, follow:true`.

### JSON-LD
Wszystko przez `jsonLdScript()` — escape `<`, `>`, `&`, U+2028, U+2029 (nie da się uciec przez `</script>` w stringowych wartościach).
- **`Organization`** — w root layout (`name`, `url`, `logo`, `sameAs`)
- **`WebSite`** z `SearchAction` — na home
- **`NewsArticle`** — na single post. `headline` cropped do 110 znaków (Google cap), `image: [url]` tablica gdy jest thumbnail, `datePublished`/`dateModified`, `articleSection`, `keywords`, `inLanguage: "pl-PL"`, `isAccessibleForFree: true`, `author` + `publisher` jako `Organization`
- **`BreadcrumbList`** — na każdej stronie z breadcrumbs
- **`ItemList`** (category), **`CollectionPage` + `ItemList`** (tag)

### Sitemap / RSS / Feed
- **Sitemap** — articles (priority 0.9 featured / 0.7 pozostałe, changeFrequency weekly) + categories (0.8 daily) + tags (0.5 weekly) + `/`, `/about`, `/privacy`. `/search` celowo pominięty (noindex + thin content).
- **RSS 2.0** — CDATA + escape XML, `<atom:link rel="self">`, enclosure z miniaturą i inferowanym MIME z extensji

### Semantyka / a11y
- **Heading anchors** zachowują polskie diakrytyki (`ą→a`, `ł→l`, …) przez `slugifyHeading()` — spójnie w renderze i TOC
- **Pagination** z `rel=prev/next` na `/kategoria/[slug]`
- **Slugi artykułów** czytelne po polsku (retry `-2`, `-3`, …); timestamp doklejany tylko przy wyczerpaniu próbek
- **Hierarchia nagłówków** — sr-only `<h1>` na home, eksplicytne `<h1>` na article/category/tag/about/privacy/search/404. Cards: `<h3>` (default), `<h2>` (featured), `<h4>` (compact)
- **`aria-current="page"`** na aktywnych linkach nawigacji (Header, Mobile drawer, CategoryBar) zamiast role="tab" (które wymagało nie-istniejących tabpanels)
- **Skip-link** `a href="#main-content"` w layout — pierwszy focusable element, widoczny przy tab
- **`<main id="main-content">`** jako landmark w layout
- **Reading time** + structured data
- **404** strona z `robots: noindex, follow`
- **`rel="nofollow noopener noreferrer"`** na share linkach

---

## 13. Bezpieczeństwo

### Nagłówki (`src/proxy.ts`)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-DNS-Prefetch-Control: on`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

Matcher wyklucza `_next/static`, `_next/image` oraz statyczne zasoby metadata (favicon/icons/robots/sitemap/feed). API routes **są** w zakresie — korzystają z tych samych nagłówków.

### Dostęp do danych
- RLS włączony na wszystkich tabelach z odpowiednimi policy
- Anon key w kodzie klienta (read-only przez RLS)
- Service role key **tylko** server-side (`admin.ts` → cron + newsletter POST)

### Input / walidacja
- **Cron auth fail-closed** — brak `CRON_SECRET` = 401 (nie bypass)
- **SSRF hardening** w scraperze — `new URL()` + protocol allowlist + internal host blacklist
- **JSON-LD escape** przez `jsonLdScript()` — `</script>` injection niemożliwy
- **Search query cap** 100 znaków (w API + `maxLength` input) — DoS guard
- **Newsletter email** regex + length ≤ 254
- **Rate limit** — 5/min newsletter, 30/min search
- **Share links** — `rel="nofollow noopener noreferrer"`

---

## 14. Wydajność

- **React Compiler** ON — auto-memoizacja komponentów i hooków
- **Next.js Image** z `sizes` i `priority` na hero
- **ISR** `revalidate` 60-3600s per route
- **`attachTagsBatch()`** — eliminacja N+1 dla tagów
- **`Promise.all`** dla równoległych zapytań layoutu
- **Lazy Supabase client** — import `data.ts` nie wymaga połączenia
- **Bounded queries** — `getArticlesByCategory` 50, `getArticlesByTag` 50, `getArticlesGroupedByCategory` `max(N × limit × 10, 200)`
- **RPC `popular_tags`** — `GROUP BY` w PostgreSQL zamiast pobierania całej junction table
- **Wspólny `useScrollY()`** — jeden globalny `window.scroll` listener dla wszystkich komponentów (ReadingProgress + ScrollToTop). Przedtem dwa osobne subscriptions
- **`@vercel/analytics` + GA** — real user metrics
- **Turbopack** — dev i production build

---

## 15. Testy

`npm test` → **28/28 passing** w 4 plikach:

| Plik | Zakres |
|---|---|
| `src/lib/data.test.ts` | `escapeIlike`, `sanitizeOrQuery`, `pluralize` — importują rzeczywisty kod z `search-utils.ts` |
| `src/lib/rate-limit.test.ts` | `rateLimit()` — 4 przypadki |
| `src/components/ui/empty-state.test.tsx` | RTL — render + props |
| `src/config/site.test.ts` | Spójność config |

### Komendy
```bash
npm run lint        # eslint — 0 errors, 0 warnings
npx tsc --noEmit    # typecheck — exit 0
npm test            # vitest — 28/28 passing
npm run build       # next build (Turbopack) — bez ostrzeżeń deprecation
```

---

## 16. Konfiguracja i środowisko

### Zmienne środowiskowe (`.env.example`)

| Zmienna | Cel | Źródło |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu Supabase | Vercel + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS-protected) | Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypass RLS | Vercel (secure) |
| `OPENROUTER_API_KEY` | OpenRouter API — Claude + Gemini | Vercel (secure) |
| `CRON_SECRET` | Bearer dla cron (obowiązkowy, fail-closed) | Vercel (secure) |
| `NEXT_PUBLIC_SITE_URL` | Base URL w SEO/sitemap/RSS/OG. Produkcja: `https://www.aifeed.pl`. Dev: `http://localhost:3000` | Vercel + `.env.local` |

### `next.config.ts`
- `reactCompiler: true`
- `images.remotePatterns` — wybrane znane domeny + wildcard HTTPS `**` (pipeline scrape'uje z nieprzewidywalnych źródeł)

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

### `src/proxy.ts`
Eksportuje funkcję `proxy()` (Next.js 16 konwencja) + `config.matcher`. Wszystkie security headers w jednym miejscu.

---

## 17. Wdrożenie i deployment

### Infrastruktura
- **Vercel project**: `aifeed-pl` (id `prj_rmKqGPpHZ6crRr7wTbYhGTO1tNRS`)
- **Team**: `m-zeprzalkas-projects`
- **Domeny**: `aifeed.pl`, `www.aifeed.pl` (aliasy)
- **Cron**: 3×/dzień (5:00, 11:00, 17:00 UTC)
- **Node runtime**: 24.x
- **Google Analytics**: `G-5SD17PTF0C`

### Lokalna weryfikacja
```bash
npm run dev         # http://localhost:3000
npm run lint        # 0 errors, 0 warnings
npx tsc --noEmit    # exit 0
npm test            # 28/28 passing
npm run build       # Turbopack, brak deprecation
```

### Ręczne wywołanie pipeline'u
```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/generate?count=10"
```

Zwraca `{message, generated[], rejected[], failed[{title,reason}], scraped, new}`. Powody w `failed`: `source-too-short`, `ai-refusal`, `insert-failed: …`, raw error message.

---

## 18. 🎯 DO ZROBIENIA

### 🔑 Akcje operacyjne (poza kodem, Vercel / Supabase dashboard)

1. **`NEXT_PUBLIC_SITE_URL = https://www.aifeed.pl`** w Vercel (All Environments). Bez tego `<link rel="canonical">` wskazuje na non-www, podczas gdy ruch idzie na www — Google widzi rozbieżność.
2. **Wygenerować nowy `OPENROUTER_API_KEY`** — aktualny zwraca 401 "User not found" w pipeline (potwierdzone próbnym triggerem). Podmienić w `.env.local` **oraz** Vercel Project Settings → Environment Variables.
3. **Zaaplikować `supabase/migrations/001_newsletter_and_popular_tags.sql`** w Supabase SQL Editor.
   - Plik migracji jest gotowy i idempotentny (`CREATE IF NOT EXISTS` / `CREATE OR REPLACE`).
   - **Krok po kroku:** dashboard → SQL Editor → New query → wklej zawartość pliku → Run.
   - Po wdrożeniu log `[data] getPopularTags RPC missing…` zniknie z buildu, a newsletter POST przestanie się psuć na świeżej instalacji DB.
   - Szybki smoke test w SQL Editor: `SELECT * FROM popular_tags(10);` (pusty wynik gdy brak `article_tags` — też OK).
4. **Rotacja kluczy** — `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (standardowa higiena po współdzieleniu podczas developmentu).
5. **Usunąć martwy projekt Vercel** `aifeed` (nie `aifeed-pl`) z dashboardu.

### 🏗️ Duże prace (code, wymagają zaplanowania)

6. **Rate limit multi-region** — przejście z in-memory `Map` na Upstash Redis przez Vercel Marketplace (`@upstash/ratelimit`). Obecnie ogranicza tylko per-instance; multi-instance deployment obchodzi limit.
7. **Content-Security-Policy header** — wymaga inventory zewnętrznych domen (GA, Vercel Analytics, Supabase, OpenRouter, obrazy scrape'owane z 20+ domen) + nonce dla inline script motywu. Nietrywialne — trzeba testować pod `report-only` zanim enforced.
8. **Testy integracyjne i E2E:**
   - unit: `parser.ts`, `writer.ts::extractMeta`, `quality.ts`, `content.ts` (z mock fetch), `generator.ts::scrapeOgImage`
   - API routes z mock Supabase
   - E2E (Playwright) — home, `/szukaj`, `/artykul/[slug]`, newsletter, pagination, **stare URL-e → 301 redirect**

### 🔧 Polish / drobne

9. **Quality gate kalibracja** — score 40-60 jako "soft warnings" (zachowaj z flagą), score < 40 = hard reject. Obecny próg 50 bywa surowy dla krótkich ale dobrych artykułów.
10. **`siteConfig.links` placeholdery** — `twitter: "https://twitter.com/aifeed"`, `github: "https://github.com/aifeed"` idą do `sameAs` w JSON-LD Organization. Jeśli konta nie istnieją, struktura jest formalnie nieprawidłowa. Decyzja: założyć konta albo usunąć `sameAs`.
11. **`vercel.ts` zamiast `vercel.json`** — TypeScript config z `@vercel/config` (rekomendowane od 2026). Opcjonalne — JSON nadal działa.
12. **Polskie źródła RSS** — Spider's Web / AntyWeb mają dużo szumu tech-general, filtr AI mitiguje ale można poszukać feedów dedykowanych AI/ML w PL.
13. **Ujednolicone error handling w `data.ts`** — wspólny helper `handleQuery<T>(result, fallback)` zamiast `if (error) { console.error; return ... }` w każdej funkcji.
14. **Per-source RSS cap** — obecnie `slice(0, 10)` na każdym feedzie, bez priorytetyzacji "jeszcze nie widziane". TechCrunch w godzinach szczytu gubi itemy między triggerami.
15. **`@vercel/speed-insights`** — `@vercel/analytics` jest, Speed Insights osobno (Core Web Vitals z RUM).
16. **GA ID hardcoded** — `G-5SD17PTF0C` wstawiony bezpośrednio w `layout.tsx`. Przenieść do `NEXT_PUBLIC_GA_ID` dla elastyczności między środowiskami.

---

*Wygenerowane automatycznie przez Claude Opus 4.7 · 2026-04-21*
