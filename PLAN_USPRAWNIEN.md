# AiFeed — Plan Usprawnień i Optymalizacji

> Audyt wykonany 2026-04-20 | Next.js 16.2.3 · React 19 · Supabase · Tailwind 4 · shadcn/ui

---

## Spis treści

1. [Optymalizacja kodu](#1-optymalizacja-kodu)
2. [Semantyka i SEO techniczne](#2-semantyka-i-seo-techniczne)
3. [SEO — braki i rekomendacje](#3-seo--braki-i-rekomendacje)
4. [Design System](#4-design-system)
5. [UX/UI](#5-uxui)
6. [Jakość kodu i architektura](#6-jakość-kodu-i-architektura)

---

## 1. Optymalizacja kodu

### 1.1 Krytyczne: N+1 queries w warstwie danych

**Problem:** Każda funkcja pobierająca artykuły wywołuje `attachTags()` w pętli — osobne zapytanie do bazy per artykuł. 10 artykułów = 11 zapytań (1 articles + 10 tags).

**Dotyczy:** `getArticles`, `getFeaturedArticles`, `getArticleBySlug`, `getArticlesByCategory`, `getArticlesByCategoryPaginated`, `searchArticles`, `getArticlesByTag`

**Rozwiązanie:** Batch query — pobrać wszystkie tagi jednym zapytaniem:

```typescript
async function attachTagsBatch(articles: (Article & { category: Category | null })[]): Promise<ArticleWithRelations[]> {
  if (articles.length === 0) return [];
  const ids = articles.map(a => a.id);
  const { data: tagRows } = await supabase
    .from("article_tags")
    .select("article_id, tag:tags(*)")
    .in("article_id", ids);

  const tagMap = new Map<string, Tag[]>();
  for (const row of (tagRows || [])) {
    const tag = (row as any).tag as Tag | null;
    if (!tag) continue;
    const existing = tagMap.get(row.article_id) || [];
    existing.push(tag);
    tagMap.set(row.article_id, existing);
  }

  return articles.map(a => ({ ...a, tags: tagMap.get(a.id) || [] }));
}
```

**Wynik:** Redukcja z N+1 do 2 zapytań (articles + all tags). Przy stronie głównej (5 równoległych fetchy) oszczędzamy ~40 zapytań.

**Priorytet:** P0 — krytyczny dla wydajności

---

### 1.2 getPopularTags — agregacja w pamięci zamiast SQL

**Problem:** Pobiera WSZYSTKIE rekordy z `article_tags` i liczy w JS. Przy 500 artykułach × 5 tagów = 2500 rekordów ładowanych do pamięci.

**Rozwiązanie:** Supabase RPC lub widok SQL z `GROUP BY`:

```sql
CREATE OR REPLACE FUNCTION get_popular_tags(tag_limit int DEFAULT 10)
RETURNS TABLE(id uuid, name text, slug text, article_count bigint) AS $$
  SELECT t.id, t.name, t.slug, COUNT(*) as article_count
  FROM tags t
  JOIN article_tags at ON t.id = at.tag_id
  GROUP BY t.id
  ORDER BY article_count DESC
  LIMIT tag_limit;
$$ LANGUAGE sql STABLE;
```

**Priorytet:** P1

---

### 1.3 getArticlesGroupedByCategory — kaskadowe N+1

**Problem:** Dla 4 kategorii na stronie głównej: 4 × `getArticlesByCategory()` = 4 × (1 category query + 1 articles query + N tag queries). Łącznie ~30 zapytań.

**Rozwiązanie:** Jedno zapytanie z filtrem `category_id IN (...)` + `attachTagsBatch`:

```typescript
export async function getArticlesGroupedByCategory(categorySlugs: string[], limitPerCategory = 4) {
  const { data: categories } = await supabase
    .from("categories").select("id, slug").in("slug", categorySlugs);
  if (!categories) return {};

  const categoryIds = categories.map(c => c.id);
  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*)")
    .eq("is_published", true)
    .in("category_id", categoryIds)
    .order("published_at", { ascending: false });

  // Group + limit per category, then batch tags
  // ...
}
```

**Priorytet:** P0

---

### 1.4 searchArticles — SQL injection via ilike

**Problem:** Query interpolacja bez escapowania:
```typescript
.or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
```
Użytkownik może wstrzyknąć znaki specjalne PostgREST.

**Rozwiązanie:** Escapować znaki specjalne `%`, `_`, `\` w query string przed interpolacją. Docelowo: Supabase Full-Text Search (`textSearch`) z `to_tsquery`.

**Priorytet:** P1

---

### 1.5 Supabase client — singleton vs. per-request

**Problem:** `src/lib/data.ts` tworzy globalny singleton `const supabase = getSupabase()` na module scope. To działa, ale nie korzysta z SSR cookie-based auth z `src/lib/supabase/server.ts`. Dwa niezależne klienty mogą powodować niespójności.

**Rozwiązanie:** Ujednolicić — data.ts powinien używać server client z cookie support (lub świadomie utrzymywać anon client z komentarzem dlaczego).

**Priorytet:** P2

---

### 1.6 Brak rate limiting na /api/search

**Problem:** Publiczny endpoint bez limitów. Bot może spamować zapytaniami.

**Rozwiązanie:** Rate limiting via `next-rate-limit` lub Vercel Edge middleware (np. 30 req/min per IP).

**Priorytet:** P2

---

### 1.7 next.config.ts — permisywna polityka obrazów

**Problem:** `remotePatterns: [{ protocol: "https", hostname: "**" }]` — akceptuje obrazy z dowolnej domeny.

**Rozwiązanie:** Whitelist znanych domen (Supabase Storage, źródła RSS, Unsplash). Fallback: proxy przez własny endpoint.

**Priorytet:** P2

---

## 2. Semantyka i SEO techniczne

### 2.1 Brak skip-to-content link

**Problem:** Brak linka umożliwiającego pominięcie nawigacji (wymóg WCAG 2.1 AA).

**Rozwiązanie:** Dodać w `layout.tsx`:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] ...">
  Przejdź do treści
</a>
// ...
<main id="main-content" className="flex-1">{children}</main>
```

**Priorytet:** P1

---

### 2.2 Brak aria-label na kluczowych regionach

**Braki:**
- CategoryBar: brak `role="navigation"` i `aria-label="Kategorie"`
- Sekcja wyszukiwania: brak `aria-live="polite"` na wynikach
- Reading progress: brak `role="progressbar"` i `aria-valuenow`
- Newsletter input: brak `aria-label` i `<form>` wrappera
- Featured card overlay: hardcoded kolory (accessibility contrast w dark mode)

**Priorytet:** P1

---

### 2.3 prefers-reduced-motion

**Problem:** Animacje `animate-fade-in-up`, `animate-marquee`, `card-hover` nie respektują preferencji użytkownika.

**Rozwiązanie:** Dodać w `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .animate-marquee {
    animation: none !important;
  }
  .card-hover {
    transition: none !important;
  }
}
```

**Priorytet:** P1

---

### 2.4 Heading hierarchy na stronie głównej

**Problem:** Strona główna ma wielokrotne `<h2>` bez nadrzędnego `<h1>`. CategoryBar i trending tags nie mają nagłówków sekcji.

**Rozwiązanie:** Dodać ukryty `<h1>` na stronie głównej:
```tsx
<h1 className="sr-only">AiFeed — Wiadomości AI, Badania i Raporty</h1>
```

**Priorytet:** P1

---

### 2.5 Structured Data — rozszerzenie

**Obecny stan:**
- Strona główna: `WebSite` schema z SearchAction
- Artykuł: `NewsArticle` schema
- Breadcrumbs: `BreadcrumbList` schema

**Brakuje:**
- **Organization schema** w layout.tsx (logo, URL, social links)
- **ItemList schema** na stronach kategorii (lista artykułów)
- **CollectionPage schema** na stronach tagów
- **FAQPage schema** (jeśli dodamy FAQ)
- **Sitelinks search box** (wymaga weryfikacji w GSC)

**Priorytet:** P1

---

### 2.6 Brak hreflang i canonical na stronach tagów

**Problem:** Strona główna i artykuły mają `canonical`, ale strony tagów nie mają.

**Rozwiązanie:** Dodać `alternates.canonical` w `generateMetadata` na `/tag/[slug]`.

Obecne:
```typescript
// tag/[slug]/page.tsx — brak canonical
```
Powinno być:
```typescript
alternates: { canonical: `/tag/${tag.slug}` }
```

**Priorytet:** P0

---

## 3. SEO — braki i rekomendacje

### 3.1 Brak stron /about i /privacy

**Problem:** Footer linkuje do `/about` i `/privacy`, ale te strony nie istnieją (404). Google indeksuje martwe linki = negatywny sygnał.

**Rozwiązanie:** Stworzyć obie strony:
- `/about` — O serwisie, jak działa pipeline, zespół/technologia
- `/privacy` — Polityka prywatności (cookies, analityka, dane)

**Priorytet:** P0

---

### 3.2 Brak Google Analytics / Plausible / analityki

**Problem:** Brak jakiegokolwiek trackingu. Nie ma danych o ruchu, zachowaniach użytkowników, bounce rate.

**Rozwiązanie:** Dodać Plausible (privacy-friendly) lub Google Analytics 4. Plausible preferowane — nie wymaga cookie consent banner.

**Priorytet:** P0

---

### 3.3 Brak Open Graph image fallback

**Problem:** Gdy artykuł nie ma `thumbnail_url`, OG images tablica jest pusta. Udostępnianie na social media pokazuje generyczny placeholder platformy.

**Rozwiązanie:** Dodać domyślny OG image (`/og-image.png` z siteConfig) jako fallback:
```typescript
images: article.thumbnail_url
  ? [{ url: article.thumbnail_url }]
  : [{ url: siteConfig.ogImage }],
```

**Priorytet:** P1

---

### 3.4 RSS Feed — brakujące pola

**Obecny stan:** Podstawowy RSS z title, link, description, pubDate.

**Brakuje:**
- `<category>` — kategoria artykułu
- `<enclosure>` — thumbnail jako media (wymagane przez wiele czytników)
- `<dc:creator>` — autor (wymaga namespace)
- `<content:encoded>` — pełna treść (opcjonalnie)

**Priorytet:** P2

---

### 3.5 Brak meta description na stronach kategorii

**Problem:** `generateMetadata` w `/category/[slug]` używa `category.description` jako meta description, ale to jest krótki opis kategorii (np. "Premiery, aktualizacje i porównania modeli AI"), nie zoptymalizowany pod SEO.

**Rozwiązanie:** Generować bardziej deskryptywne meta descriptions:
```typescript
description: `Najnowsze artykuły w kategorii ${category.name} — ${category.description}. Czytaj na AiFeed.`
```

**Priorytet:** P2

---

### 3.6 Brak Internal Linking Strategy

**Problem:** Artykuły nie linkują do siebie nawzajem w treści. Jedyny internal linking to sekcja "Podobne Publikacje" na dole (3 artykuły z tej samej kategorii).

**Rozwiązanie:**
- **Kontekstowe linki w treści** — modyfikacja prompta AI, aby wstawiał linki do pokrewnych artykułów (wymaga przekazania listy istniejących artykułów do generatora)
- **Sidebar "Czytaj też"** na stronie artykułu
- **Paginacja kategorii** — "Następny/Poprzedni artykuł" na dole single

**Priorytet:** P2

---

### 3.7 Brak sitemap dla tagów

**Problem:** `sitemap.ts` generuje URL-e dla artykułów i kategorii, ale pomija strony tagów (`/tag/[slug]`).

**Rozwiązanie:** Dodać pobieranie tagów i ich URL-i do sitemap:
```typescript
const tags = await getPopularTags(100); // lub getAllTags()
const tagUrls = tags.map(tag => ({
  url: `${baseUrl}/tag/${tag.slug}`,
  lastModified: new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.5,
}));
```

**Priorytet:** P1

---

### 3.8 Brak favicon i apple-touch-icon

**Problem:** Nie znaleziono plików favicon.ico, apple-touch-icon.png, ani manifest.json w katalogu `public/` lub `app/`.

**Rozwiązanie:** Dodać:
- `app/icon.tsx` — dynamiczny favicon (lub statyczne pliki)
- `app/apple-icon.tsx` — Apple touch icon
- `app/manifest.ts` — Web App Manifest (PWA-ready)

**Priorytet:** P1

---

## 4. Design System

### 4.1 Typografia — niespójne rozmiary

**Problem:** Mieszane podejście do rozmiarów tekstu:
- Tailwind scale: `text-sm`, `text-base`, `text-lg`, `text-xl`...
- Hardcoded wartości: `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]`

Te hardcoded wartości pojawiają się w ~20 miejscach i tworzą nieformalną skalę, ale nie jest ona zdefiniowana w Design System.

**Rozwiązanie:** Zdefiniować custom scale w Tailwind theme:
```css
@theme inline {
  --font-size-caption: 10px;
  --font-size-label: 11px;
  --font-size-body-sm: 13px;
  --font-size-body: 15px;
}
```
Następnie użyć `text-caption`, `text-label`, `text-body-sm`, `text-body` zamiast `text-[Npx]`.

**Priorytet:** P2

---

### 4.2 Spacing — brak tokenu kontenerowego

**Problem:** Padding kontenera (`px-4 sm:px-6 lg:px-8`) powtarza się w ~15 miejscach. Zmiana wymaga edycji każdego pliku.

**Rozwiązanie:** Wyekstrahować do utility lub komponentu:
```css
@utility container-padding {
  @apply px-4 sm:px-6 lg:px-8;
}
```
Lub komponent `<Container>`.

**Priorytet:** P3

---

### 4.3 Kolory — hardcoded czarne gradienty

**Problem:** `gradient-overlay` w CSS i `FeaturedCard` używa `rgba(0,0,0,...)` zamiast zmiennych tematycznych. W dark mode overlay na ciemnym tle jest praktycznie niewidoczny.

**Dotyczy:**
- `globals.css`: `.gradient-overlay` — `rgba(0,0,0,0.7)` to `rgba(0,0,0,0)`
- `article-card.tsx`: `from-black/90 via-black/40 to-transparent`

**Rozwiązanie:** Użyć zmiennych CSS lub dynamicznych klas:
```css
.gradient-overlay {
  background: linear-gradient(
    to top,
    oklch(0.12 0.02 260 / 0.85) 0%,
    oklch(0.12 0.02 260 / 0.3) 50%,
    transparent 100%
  );
}
```

**Priorytet:** P2

---

### 4.4 Border radius — niespójna skala

**Problem:** Większość komponentów używa `rounded-xl` lub `rounded-lg`, ale `FeaturedCard` ma `rounded-[1.25rem]` (hardcoded). Kategorie mają `rounded-full`.

**Rozwiązanie:** Zmapować wszystkie użycia:
- Karty: `rounded-xl` (spójnie)
- Pilulki/badges: `rounded-full`
- Inputy/buttony: `rounded-lg`
- Usunąć `rounded-[1.25rem]` → zamienić na `rounded-xl`

**Priorytet:** P3

---

### 4.5 Komponent meta info — duplikacja wzorca

**Problem:** Wzorzec "ikona + tekst mono + separator" powtarza się w 4 miejscach:
- `article-card.tsx` (FeaturedCard, DefaultCard, CompactCard)
- `article/[slug]/page.tsx` (header meta)

Każde miejsce ma lekko inne rozmiary i spacing.

**Rozwiązanie:** Wyekstrahować komponent `<ArticleMeta>`:
```tsx
function ArticleMeta({ readingTime, date, size = "sm" }) { ... }
```

**Priorytet:** P3

---

### 4.6 Brak Design Tokens dokumentacji

**Problem:** Kolory, spacing, typografia, animacje, cienie — wszystko jest w kodzie, ale nigdzie nie jest udokumentowane jako Design System.

**Rozwiązanie:** Stworzyć `DESIGN_SYSTEM.md` lub Storybook z dokumentacją:
- Paleta kolorów (light/dark)
- Skala typografii
- Spacing grid
- Komponenty z wariantami
- Animacje i motion

**Priorytet:** P3

---

## 5. UX/UI

### 5.1 Newsletter — formularz nie działa

**Problem:** Dwa formularze newsletter (homepage + footer) to martwy HTML. Nie ma submit handler, walidacji, ani integracji z mailingiem.

**Rozwiązanie:**
1. Opakować w `<form>` z obsługą submit
2. Endpoint API `/api/newsletter` z walidacją email
3. Integracja z Supabase (tabela `newsletter_subscribers`) lub zewnętrzny serwis (Resend, Mailchimp)
4. Stany UX: loading, success ("Zapisano!"), error ("Nieprawidłowy email")
5. Honeypot field (antyspam)

**Priorytet:** P1

---

### 5.2 Strona wyszukiwania — brak paginacji i UX

**Problemy:**
- Brak paginacji — ładuje max 20 wyników bez "pokaż więcej"
- Brak `aria-live` na wynikach (screen readery nie ogłaszają zmian)
- Pluralizacja "wyników" niepoprawna (1 = "wynik", 2-4 = "wyniki", 5+ = "wyników")
- Search input nie ma `<label>` (accessibility)

**Priorytet:** P2

---

### 5.3 Martwe linki w stopce

**Problem:** `/about` i `/privacy` zwracają 404.

**Rozwiązanie:** Stworzyć te strony (patrz punkt 3.1) lub usunąć linki tymczasowo.

**Priorytet:** P0

---

### 5.4 Mobile menu — brak animacji

**Problem:** Menu mobilne pojawia się/znika skokowo (warunek `{mobileOpen && <div>}`). Brak animacji wejścia/wyjścia.

**Rozwiązanie:** Użyć shadcn `Sheet` (drawer) lub dodać CSS transition z `max-height` / `opacity`.

**Priorytet:** P3

---

### 5.5 Empty states — niespójne

**Problem:** Różne strony mają różne empty states:
- Kategoria: "Jeszcze brak artykułów."
- Tag: "Jeszcze brak artykułów z tym tagiem."
- Wyszukiwarka: "Żadne artykuły nie zostały znalezione."

Brak spójnego wzorca i brak ikony/ilustracji.

**Rozwiązanie:** Wyekstrahować komponent `<EmptyState icon={...} title={...} description={...} />` z opcjonalnym CTA.

**Priorytet:** P3

---

### 5.6 Scroll to top — brak wizualnego buttona

**Problem:** `ScrollToTop` komponent wymusza scroll na nawigacji, ale nie ma wizualnego przycisku "wróć do góry" przy długim scrollowaniu (zwłaszcza na stronie głównej z 20+ sekcjami).

**Rozwiązanie:** Dodać floating button w prawym dolnym rogu (pojawia się po scroll > 400px).

**Priorytet:** P3

---

### 5.7 Artykuł — brak "Następny/Poprzedni"

**Problem:** Po przeczytaniu artykułu użytkownik widzi "Podobne Publikacje" (3 karty), ale nie ma prostej nawigacji do następnego/poprzedniego artykułu w kategorii.

**Rozwiązanie:** Dodać sekcję z przyciskami:
```
← Poprzedni artykuł    Następny artykuł →
```
Pobieranie: artykuły z tej samej kategorii, sortowane po dacie.

**Priorytet:** P3

---

### 5.8 Artykuł — Table of Contents

**Problem:** Dłuższe artykuły (5+ min czytania) nie mają spisu treści. Użytkownik nie widzi struktury przed przeczytaniem.

**Rozwiązanie:** Generować ToC z nagłówków h2/h3 w treści markdown. Wyświetlać jako sticky sidebar na desktop lub rozwijalny element na mobile.

**Priorytet:** P3

---

## 6. Jakość kodu i architektura

### 6.1 Brak testów

**Problem:** Zero testów — brak Jest, Vitest, Testing Library, Playwright, Cypress. Przy pipeline generującym content automatycznie to krytyczne ryzyko.

**Rozwiązanie:**
- **Unit testy** (Vitest): data.ts, quality.ts, parser.ts, content.ts
- **Component testy** (Testing Library): ArticleCard, Breadcrumbs, CategoryBar
- **E2E** (Playwright): homepage load, category navigation, article read, search

**Priorytet:** P1

---

### 6.2 Brak Error Boundary

**Problem:** Jeśli ReactMarkdown rzuci błąd (złamany markdown), cała strona artykułu crashuje bez fallbacku.

**Rozwiązanie:** Dodać `error.tsx` w `article/[slug]/` z przyjaznym komunikatem.

**Priorytet:** P1

---

### 6.3 Brak middleware.ts

**Problem:** Brak middleware — nie ma:
- Redirect http → https
- Redirect www → non-www (lub odwrotnie)
- Security headers (CSP, X-Frame-Options, etc.)
- Bot detection

**Rozwiązanie:** Stworzyć `src/middleware.ts`:
```typescript
import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=()");
  return response;
}
```

**Priorytet:** P1

---

### 6.4 Brak error handling w data.ts

**Problem:** Żadna funkcja w data.ts nie obsługuje `error` z Supabase response:
```typescript
const { data: articles } = await supabase.from("articles").select("...");
// `error` jest ignorowane
```

**Rozwiązanie:** Dodać sprawdzanie błędów i logowanie:
```typescript
const { data, error } = await supabase.from("articles").select("...");
if (error) {
  console.error("[data] getArticles failed:", error.message);
  return [];
}
```

**Priorytet:** P1

---

### 6.5 Cron pipeline — brak monitoringu

**Problem:** `/api/cron/generate` loguje do console, ale nie ma structured logging ani alertów. Jeśli pipeline przestanie działać (np. API rate limit), nikt się nie dowie.

**Rozwiązanie:**
- Structured JSON logs (timestamp, level, article_id, duration)
- Webhook do Slacka/Discorda przy failure
- Supabase tabela `pipeline_runs` z podsumowaniem (scraped, generated, rejected, errors)
- Dashboard z metrykami

**Priorytet:** P2

---

### 6.6 UNSPLASH_ACCESS_KEY — nieużywany env

**Problem:** Klucz w `.env.local` nie jest używany nigdzie w kodzie.

**Rozwiązanie:** Usunąć z `.env.local`.

**Priorytet:** P3

---

### 6.7 Duplikacja danych artykułów między generateMetadata a page

**Problem:** W `article/[slug]/page.tsx` artykuł jest pobierany dwa razy — raz w `generateMetadata`, raz w `ArticlePage`. Next.js deduplikuje requesty na poziomie `fetch`, ale Supabase client nie korzysta z `fetch` cache.

**Rozwiązanie:** Użyć React `cache()`:
```typescript
import { cache } from "react";

const getCachedArticle = cache(async (slug: string) => {
  return getArticleBySlug(slug);
});
```
Następnie użyć `getCachedArticle` w obu miejscach.

**Priorytet:** P1

---

### 6.8 Brak lazy loading dla sekcji poniżej fold

**Problem:** Strona główna ładuje wszystkie sekcje naraz (hero + grid + 4 kategorie + newsletter + about). Sekcje poniżej fold nie są lazy-loaded.

**Rozwiązanie:** Dla sekcji kategorii, newsletter i about — rozważyć `dynamic()` import lub Intersection Observer z skeleton fallback.

**Priorytet:** P3

---

## Priorytety — podsumowanie

### P0 — Natychmiast (wpływ na SEO / błędy produkcyjne)
| # | Zadanie | Plik(i) |
|---|---------|---------|
| 1.1 | N+1 queries → batch | `src/lib/data.ts` |
| 1.3 | getArticlesGroupedByCategory → 1 query | `src/lib/data.ts` |
| 2.6 | Canonical na stronach tagów | `src/app/tag/[slug]/page.tsx` |
| 3.1 | Stworzyć /about i /privacy | nowe pliki |
| 5.3 | Naprawić martwe linki (lub usunąć) | `footer.tsx` |

### P1 — Tydzień (SEO, wydajność, dostępność)
| # | Zadanie | Plik(i) |
|---|---------|---------|
| 1.2 | getPopularTags → SQL aggregation | `data.ts`, Supabase |
| 1.4 | searchArticles — escape ilike | `data.ts` |
| 2.1 | Skip-to-content link | `layout.tsx` |
| 2.2 | Aria labels na regionach | wiele komponentów |
| 2.3 | prefers-reduced-motion | `globals.css` |
| 2.4 | H1 na stronie głównej | `(home)/page.tsx` |
| 2.5 | Organization + ItemList schema | `layout.tsx`, category page |
| 3.3 | OG image fallback | `article/page.tsx` |
| 3.7 | Tagi w sitemap | `sitemap.ts` |
| 3.8 | Favicon + apple-icon + manifest | `app/` |
| 5.1 | Newsletter — functional form | homepage, footer |
| 6.1 | Testy (Vitest + Testing Library) | nowe pliki |
| 6.2 | Error boundary artykułu | `article/[slug]/error.tsx` |
| 6.3 | Middleware (security headers) | `src/middleware.ts` |
| 6.4 | Error handling w data.ts | `data.ts` |
| 6.7 | React cache() dla artykułu | `article/page.tsx` |

### P2 — Miesiąc (quality of life)
| # | Zadanie |
|---|---------|
| 1.5 | Ujednolicić Supabase clients |
| 1.6 | Rate limiting /api/search |
| 1.7 | Whitelist domen obrazów |
| 3.2 | Analityka (Plausible/GA4) |
| 3.4 | RSS — pola category, enclosure |
| 3.5 | Meta descriptions kategorii |
| 3.6 | Internal linking strategy |
| 4.1 | Typografia — custom scale |
| 4.3 | Gradient overlay → theme-aware |
| 5.2 | Search UX (paginacja, aria-live) |
| 6.5 | Pipeline monitoring |

### P3 — Backlog
| # | Zadanie |
|---|---------|
| 4.2 | Container padding utility |
| 4.4 | Border radius audit |
| 4.5 | ArticleMeta component |
| 4.6 | Design System documentation |
| 5.4 | Mobile menu animation |
| 5.5 | EmptyState component |
| 5.6 | Scroll-to-top button |
| 5.7 | Następny/Poprzedni artykuł |
| 5.8 | Table of Contents |
| 6.6 | Usunąć UNSPLASH_ACCESS_KEY |
| 6.8 | Lazy loading sekcji below fold |

---

## Szacunkowy wpływ

| Obszar | Obecny stan | Po wdrożeniu P0+P1 |
|--------|-------------|---------------------|
| Zapytania DB (homepage) | ~50+ | ~8-10 |
| Lighthouse Performance | ~75 (est.) | ~90+ |
| Lighthouse SEO | ~80 (est.) | ~95+ |
| Lighthouse Accessibility | ~70 (est.) | ~90+ |
| Core Web Vitals (LCP) | Wolne (N+1) | Szybkie |
| Indeksowanie | Częściowe (brak tagów, martwe linki) | Kompletne |
| Structured Data | Podstawowe | Rozszerzone |
