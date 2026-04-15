# AiFeed — Automatyczny Magazyn AI

Zautomatyzowany serwis informacyjny o sztucznej inteligencji. Codziennie scrapuje najlepsze anglojęzyczne źródła, generuje profesjonalne artykuły po polsku za pomocą Claude AI i publikuje je z linkiem do oryginału.

**Strona**: [aifeed.pl](https://aifeed.pl)

---

## Jak to działa (logika od A do Z)

Cały proces jest w pełni automatyczny. Oto co się dzieje po kolei:

### 1. Scrapowanie RSS (co dzień o 8:00 UTC)

Vercel Cron odpala `POST /api/cron/generate`. System równolegle pobiera feedy z **15 źródeł RSS** — od dużych redakcji (TechCrunch, The Verge, Wired, MIT Tech Review) po blogi producentów AI (OpenAI, Google DeepMind, Hugging Face). Pełna lista źródeł jest w `src/lib/scraper/sources.ts`.

Każdy artykuł z RSS-a jest filtrowany pod kątem tematyki AI (keywords jak "ai", "llm", "gpt", "claude", "transformer" itp.). Blogi firmowe (OpenAI, DeepMind, Microsoft, NVIDIA, Hugging Face) przechodzą automatycznie — z definicji są o AI.

### 2. Deduplikacja

System sprawdza URL każdego artykułu z tabelą `scraped_items` w Supabase. Jeśli URL już był przetworzony — pomija go. Dzięki temu nigdy nie wygenerujemy dwa razy tego samego tematu.

### 3. Ranking (algorytm greedy)

Z puli nowych artykułów system wybiera najlepsze. Algorytm punktuje:
- **Świeżość** — im nowszy artykuł, tym więcej punktów (traci 2 pkt na godzinę)
- **Różnorodność źródeł** — kara 20 pkt za każdy artykuł z tego samego źródła już wybrany

Efekt: system naturalnie wybiera świeże artykuły z różnych redakcji zamiast 5 newsów z TechCruncha.

### 4. Generowanie artykułu (Claude AI)

Dla wybranego artykułu źródłowego system wywołuje Claude Sonnet 4 (przez OpenRouter API) z precyzyjnym promptem:
- Pisze **po polsku**, tonem dziennikarskim
- **MUSI** umieścić link do oryginalnego artykułu w pierwszym akapicie
- 800-1200 słów, format Markdown
- Na końcu zwraca metadane JSON: tytuł, excerpt, kategorię, tagi, czas czytania

### 5. Obraz z Unsplash

System szuka odpowiedniego zdjęcia na Unsplash API (3 pierwsze słowa tytułu jako query). Jeśli nie znajdzie — losuje z puli 10 kuratorowanych zdjęć technologicznych.

### 6. Zapis do bazy

Artykuł trafia do Supabase z: treścią, metadanymi, linkami źródłowymi, obrazem, tagami. Jest od razu `is_published = true`.

### 7. Frontend odświeża się automatycznie

Strona główna ma `revalidate = 300` (5 min), artykuły `revalidate = 60` (1 min). Po wygenerowaniu artykułu pojawi się na stronie w ciągu kilku minut.

```
Vercel Cron (08:00 UTC)
    |
    v
Scrape 15 feedów RSS (równolegle)
    |
    v
Filtr AI keywords + deduplikacja
    |
    v
Ranking (świeżość + różnorodność)
    |
    v
Claude AI → artykuł po polsku z linkiem do źródła
    |
    v
Unsplash → thumbnail
    |
    v
Supabase → zapis artykułu + tagi
    |
    v
Frontend odświeża się przez ISR
```

---

## Gdzie zmieniać parametry

To jest najważniejsza sekcja. Poniżej lista wszystkich "pokręteł" systemu i gdzie je znaleźć.

### Ile artykułów generować na raz

**Plik**: `src/app/api/cron/generate/route.ts`, linia z `selectTopArticles(newItems, N)`

```typescript
const topItems = selectTopArticles(newItems, 1); // <- zmień liczbę
```

Aktualnie ustawione na **1** (tryb testowy kosztów). Docelowo 3-5.

### Jak często uruchamiać pipeline

**Plik**: `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/generate",
    "schedule": "0 8 * * *"
  }]
}
```

Format: cron (`minuty godzina dzień miesiąc dzień_tygodnia`). Np. `"0 8,14,20 * * *"` = trzy razy dziennie.

### Źródła RSS

**Plik**: `src/lib/scraper/sources.ts`

Każde źródło to obiekt `{ name, url, category }`. Aby dodać nowe:

```typescript
{
  name: "Nazwa Źródła",
  url: "https://example.com/feed.xml",
  category: "modele-ai",  // slug kategorii z bazy
},
```

Aby usunąć — wystarczy skasować wpis z tablicy.

### Kategorie

**Trzy miejsca muszą być spójne:**

1. **Baza danych** (tabela `categories`) — to jest źródło prawdy
2. **Frontend config**: `src/config/site.ts` — nazwy, slugi, kolory (używane przez stronę główną)
3. **Prompt AI**: `src/lib/ai/prompts.ts` — lista kategorii w polu `ARTICLE_USER_PROMPT` (żeby AI wiedział jakie kategorie wybrać)

Aktualne kategorie:

| Nazwa | Slug | Kolor | Opis |
|-------|------|-------|------|
| Modele AI | `modele-ai` | `#6366f1` | GPT, Claude, Gemini, Llama itp. |
| Badania i Nauka | `badania` | `#8b5cf6` | Papers, odkrycia naukowe |
| Biznes i Rynek | `biznes` | `#06b6d4` | Startupy, inwestycje, rynek |
| Etyka i Bezpieczeństwo | `etyka` | `#f59e0b` | Regulacje, alignment, deepfake |
| Narzędzia i Aplikacje | `narzedzia` | `#10b981` | Nowe narzędzia, IDE, platformy |
| Poradniki | `poradniki` | `#ec4899` | Tutoriale, how-to |

### Styl i ton artykułów

**Plik**: `src/lib/ai/prompts.ts`

- `ARTICLE_SYSTEM_PROMPT` — definiuje osobowość AI: ton, długość, format, zasady linkowania
- `ARTICLE_USER_PROMPT` — szablon z tematem, źródłami, listą kategorii i instrukcjami co do tagów

Kluczowe elementy promptu:
- Długość: 800-1200 słów (zmień w system prompt)
- Język: polski (hardcoded w obu promptach)
- Link źródłowy: wymuszony w pierwszym akapicie
- Tagi: 3-5, po polsku (oprócz nazw własnych)

### Model AI i koszty

**Plik**: `src/lib/ai/writer.ts`

```typescript
model: "anthropic/claude-sonnet-4",  // model AI
max_tokens: 4096,                     // max długość odpowiedzi
```

Koszt jednego artykułu (ostatni test): ~2868 tokenów (1042 prompt + 1826 completion).

Aby zmienić model — edytuj string `model`. Dostępne na OpenRouter: `anthropic/claude-haiku-3-5`, `google/gemini-2.0-flash`, etc. Tańsze modele = niższa jakość.

### Słowa kluczowe do filtrowania AI

**Plik**: `src/lib/scraper/parser.ts`

```typescript
const aiKeywords = ["ai", "artificial intelligence", "machine learning", ...];
```

Artykuł musi zawierać co najmniej jedno z tych słów w tytule lub opisie. Blogi firmowe przechodzą automatycznie.

### Algorytm rankingu

**Plik**: `src/lib/scraper/parser.ts`, funkcja `selectTopArticles`

```
score = (100 - hoursOld * 2) - (sourceCount * 20)
```

- `hoursOld * 2` — jak szybko tracimy punkty za wiek (zwiększ = preferuj nowsze)
- `sourceCount * 20` — kara za powtórzenie źródła (zwiększ = więcej różnorodności)

---

## Źródła RSS (stan aktualny)

15 działających źródeł:

| # | Źródło | Typ | Kategoria |
|---|--------|-----|-----------|
| 1 | TechCrunch AI | Redakcja | Biznes i Rynek |
| 2 | The Verge AI | Redakcja | Modele AI |
| 3 | Ars Technica | Redakcja | Badania i Nauka |
| 4 | VentureBeat AI | Redakcja | Biznes i Rynek |
| 5 | MIT Technology Review | Redakcja | Badania i Nauka |
| 6 | Wired AI | Redakcja | Modele AI |
| 7 | The Decoder | Redakcja | Modele AI |
| 8 | AI News | Redakcja | Biznes i Rynek |
| 9 | OpenAI Blog | Blog firmowy | Modele AI |
| 10 | Google AI Blog | Blog firmowy | Modele AI |
| 11 | Google DeepMind | Blog firmowy | Badania i Nauka |
| 12 | Microsoft AI Blog | Blog firmowy | Biznes i Rynek |
| 13 | NVIDIA AI Blog | Blog firmowy | Modele AI |
| 14 | Hugging Face Blog | Blog firmowy | Narzędzia |
| 15 | Hacker News AI | Agregator | Narzędzia |

Brak publicznych RSS: Anthropic, Meta AI, Mistral AI (sprawdzone 2026-04-10, zwracają 404).

---

## Stack technologiczny

| Warstwa | Technologia |
|---------|------------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| React | React 19.2.4 + React Compiler |
| UI | shadcn/ui + Tailwind CSS 4 (OKLCH) |
| Baza danych | Supabase (PostgreSQL + RLS) |
| AI | Claude Sonnet 4 przez OpenRouter |
| Obrazy | Unsplash API + fallback pool |
| Deploy | Vercel |

---

## Szybki start

### 1. Instalacja

```bash
git clone <repo-url> && cd aifeed
npm install
```

### 2. Konfiguracja

```bash
cp .env.example .env.local
# Uzupełnij wartości w .env.local
```

Wymagane zmienne:

| Zmienna | Skąd wziąć | Po co |
|---------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Połączenie z bazą |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | j.w. | Publiczny odczyt |
| `SUPABASE_SERVICE_ROLE_KEY` | j.w. | Zapis do bazy (pipeline) |
| `OPENROUTER_API_KEY` | openrouter.ai/keys | Generowanie artykułów |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers | Obrazy (opcjonalne) |
| `CRON_SECRET` | Wymyśl dowolny string | Ochrona endpointu generate |
| `NEXT_PUBLIC_SITE_URL` | Twój URL | SEO, sitemap, RSS |

### 3. Baza danych

Uruchom `supabase/schema.sql` w Supabase SQL Editor. Tworzy tabele, indeksy, RLS i seeduje 6 kategorii.

### 4. Uruchomienie

```bash
npm run dev     # Dev server (port 3000)
npm run build   # Build produkcyjny
```

### 5. Ręczne generowanie artykułu

```bash
curl -X POST http://localhost:3000/api/cron/generate \
  -H "Authorization: Bearer TWOJ_CRON_SECRET"
```

---

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx                  # Strona główna
│   ├── layout.tsx                # Root layout
│   ├── article/[slug]/page.tsx   # Strona artykułu
│   ├── category/[slug]/page.tsx  # Kategoria
│   ├── search/page.tsx           # Wyszukiwarka
│   ├── feed.xml/route.ts        # RSS feed
│   ├── sitemap.ts               # Mapa strony
│   └── api/
│       ├── cron/generate/route.ts  # <-- Pipeline generowania
│       ├── cron/seed/route.ts      # Seedowanie testowych artykułów
│       └── search/route.ts         # API wyszukiwania
│
├── lib/
│   ├── scraper/
│   │   ├── sources.ts        # <-- Lista źródeł RSS
│   │   └── parser.ts         # <-- Scraper + algorytm rankingu
│   ├── ai/
│   │   ├── prompts.ts        # <-- Prompty AI (ton, styl, zasady)
│   │   └── writer.ts         # <-- Wywołanie Claude API
│   ├── images/generator.ts   # Unsplash + fallback
│   ├── data.ts               # Warstwa danych (zapytania Supabase)
│   └── supabase/
│       ├── client.ts          # Klient przeglądarki (anon)
│       ├── server.ts          # Klient serwera (SSR)
│       └── admin.ts           # Klient admina (service_role)
│
├── config/
│   └── site.ts               # <-- Nazwa, URL, kategorie
│
├── components/
│   ├── articles/              # ArticleCard (3 warianty), CategoryBar
│   ├── layout/                # Header, Footer, ThemeToggle
│   └── ui/                    # Komponenty shadcn/ui
│
└── types/database.ts          # Typy TypeScript
```

Pliki oznaczone `<--` to te, które najczęściej będziesz edytować.

---

## Baza danych

### Tabele

```
categories           articles                tags
 id (uuid PK)        id (uuid PK)            id (uuid PK)
 name                title                   name (unique)
 slug (unique)       slug (unique)           slug (unique)
 description         excerpt
 color               content (Markdown)      article_tags (junction)
 created_at          category_id → FK         article_id → FK
                     thumbnail_url            tag_id → FK
                     source_urls TEXT[]
                     source_titles TEXT[]     scraped_items (cache)
                     reading_time             source_url (unique)
                     is_featured              title
                     is_published             is_processed
                     published_at
```

### Bezpieczeństwo (RLS)

- Publiczny odczyt na wszystkich tabelach (tylko opublikowane artykuły)
- Zapis wyłącznie przez `service_role` (backend pipeline)
- Klucz `anon` nie może nic zapisać

---

## API

| Metoda | Endpoint | Auth | Co robi |
|--------|----------|------|---------|
| `POST` | `/api/cron/generate` | `Bearer CRON_SECRET` | Generuje artykuły |
| `GET` | `/api/cron/generate` | Brak | Health check |
| `POST` | `/api/cron/seed` | `Bearer CRON_SECRET` | Bulk seedowanie (testowe) |
| `GET` | `/api/search?q=...` | Brak | Wyszukiwanie artykułów |

### Ręczne triggerowanie

```bash
# Generuj artykuły
curl -X POST http://localhost:3000/api/cron/generate \
  -H "Authorization: Bearer aifeed-cron-secret-2024"

# Seeduj testowe dane (opcjonalnie z parametrami)
curl -X POST "http://localhost:3000/api/cron/seed?category=modele-ai&limit=2" \
  -H "Authorization: Bearer aifeed-cron-secret-2024"
```

---

## Deploy na Vercel

1. Wypchnij na GitHub
2. Zaimportuj w Vercel Dashboard
3. Dodaj zmienne środowiskowe w Settings → Environment Variables
4. Deploy

Cron uruchamia się automatycznie wg `vercel.json`. Nic więcej nie trzeba konfigurować.

---

## Koszty

### AI (OpenRouter / Claude)

Ostatni pomiar (2026-04-10): **~2868 tokenów na artykuł** (1042 prompt + 1826 completion).

Przy Claude Sonnet 4 przez OpenRouter:
- 1 artykuł/dzień ≈ kilka centów
- 5 artykułów/dzień ≈ kilkanaście centów
- Miesięcznie przy 5/dzień ≈ $3-5

Tokeny są logowane w konsoli: `[AI Cost] Tokens — prompt: X, completion: Y, total: Z`

### Supabase

Darmowy tier wystarcza (500MB bazy, unlimited API calls). Przy obecnej skali nie ma ryzyka przekroczenia.

### Unsplash

Darmowy tier: 50 req/h. Przy 1-5 artykułach/dzień — bez problemu.

---

## Rozwój i troubleshooting

### Artykuł się nie ładuje (skeleton wisi)

Sprawdź czy content artykułu nie zaczyna się od `# ` (h1). Parser markdown obsługuje `#` do `######`, ale starsze artykuły mogły mieć problem. Fix: `src/app/article/[slug]/page.tsx`, funkcja `renderMarkdown`.

### Feed RSS nie działa

Przetestuj URL ręcznie w przeglądarce. Feedy firm AI często się zmieniają. Jeśli 404 — usuń z `sources.ts`.

### Artykuł nie ma linku do źródła

Prompt wymusza link w pierwszym akapicie, ale AI może czasem zignorować. Sprawdź `src/lib/ai/prompts.ts` — sekcja "ARTYKUŁ ŹRÓDŁOWY (OBOWIĄZKOWY LINK)".

### Kategoria nie pasuje

AI wybiera kategorię z listy w prompcie. Jeśli dodajesz nową kategorię — dodaj ją też w `ARTICLE_USER_PROMPT` w `prompts.ts`, inaczej AI jej nie wybierze.

---

## Licencja

Projekt prywatny. Wszelkie prawa zastrzeżone.
