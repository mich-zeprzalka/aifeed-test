# AiFeed — Automatyczny Magazyn AI

Zautomatyzowany serwis informacyjny o sztucznej inteligencji. Codziennie scrapuje najlepsze anglojęzyczne źródła, pobiera pełną treść bazowych artykułów, generuje profesjonalne artykuły po polsku za pomocą Claude AI w wytyczonym tonie, analizuje ich jakość, a po zaakceptowaniu publikuje z adekwatnym zdjęciem w polskim tłumaczeniu.

**Strona**: [aifeed.pl](https://aifeed.pl)

---

## Jak to działa (logika od A do Z)

Cały proces jest w pełni automatyczny. Oto co się dzieje po kolei:

### 1. Scrapowanie RSS (co dzień o 8:00 UTC)

Vercel Cron odpala `POST /api/cron/generate`. System równolegle pobiera feedy z **15 źródeł RSS** — od dużych redakcji (TechCrunch, The Verge, Wired, MIT Tech Review) po blogi producentów AI (OpenAI, Google DeepMind, Hugging Face). Pełna lista źródeł jest w `src/lib/scraper/sources.ts`.

Kluczowe artykuły są przefiltrowane przez tagi tematyki AI (LLM, GPT, Anthropic, Claude, Model, Transformer).

### 2. Deduplikacja i Ranking

System weryfikuje czy dany adres widnieje w tabeli `scraped_items`. Jeśli URL jest nowy, używany algorytmu punktowania:
- **Świeżość** — im nowszy artykuł, tym więcej punktów.
- **Różnorodność źródeł** — znaczny minus za duplikat wydawcy w tym samym batchu.

### 3. Pobieranie Pełnej Treści Artykułu (Deep Scraping)

System docelowo odwiedza adres źródłowy i używa scrapera `scrapeArticleContent`, aby zgrać faktyczną, pełną treść tekstu artykułu. Służy to uzyskaniu wiernego, szczegółowego kontekstu, na którym ma opierać się końcowy artykuł.

### 4. Generowanie Artykułu (Claude AI)

System wywołuje `Claude Sonnet 4` (przez OpenRouter) przekazując w prompcie instrukcje i treść wyciągnięta. Wymagane jest:
- Pisanie **po polsku**, rzetelnym tonem dziennikarskim,
- Obowiązkowy podział na podsekcje oraz sekcja "Kluczowe Wnioski",
- Obowiązkowe linkowanie bezpośrednie do źródła,
- Wynik zwracany jest formacie Markdown razem z listą adekwatnych tagów i metadanymi.

### 5. Bramka Jakościowa (Quality Gate)

Wygenerowany artykuł przechodzi przez rygorystyczny proces oceny (`src/lib/ai/quality.ts`), za który dostaje od 0 do 100 punktów. Artykuły bez linku zwrotnego, zbyt krótkie (poniżej 200 słów), pozbawione części "Kluczowych Wniosków", tagów lub ze złą kategorią tracą punkty. Artykuły ze wskaźnikiem `< 50 pkt.` **są odrzucane**.

### 6. Thumbnail i Zapis

Dla pozytywnie zaliczonych tekstów system poszukuje grafiki Unsplash na podstawie zapytania, przypisuje tagi, a finalnie wrzuca obiekt z flagą `is_published = true` do bazy Supabase.

### 7. Aktualizacja Frontendu

Serwer automatycznie rewaliduje stronę główną.

```text
Vercel Cron (08:00 UTC)
    |
    v
Scrape 15 feedów RSS (równolegle)
    |
    v
Filtr AI + deduplikacja URL
    |
    v
Ranking (wybór najlepszych nowości)
    |
    v
Pobranie pełnej zawartości wpisów (Full Content Scraping)
    |
    v
Claude AI → stworzenie rozbudowanego artykułu
    |
    v
Quality Gate → ocena tekstu (odrzut przy >= 50 błędów w punktacji)
    |
    v
Unsplash → wygenerowanie obrazu
    |
    v
Supabase → zapis (związanie tagów i kategorii)
    |
    v
Frontend ISR (odświeżenie podstron z użyciem paginacji i nowych UI)
```

---

## Nowości Frontendowe i Dodatki UX

Oprócz backendowego loga pipeline, UI zawiera teraz kompletne komponenty ułatwiające czytanie:
- **Paginacja**: Odpowiedni przepływ listów wpisów dla Strony głównej, Kategorii i nowo wprowadzonych Tagów.
- **Odświeżona strona czytelnika**: Zawiera *Breadcrumbs* (okruszki do wstecznego powrotu), górny *Reading Progress Indicator* oraz guziki do udostępniania (*Share Buttons*).
- **Zoptymalizowane Routingi**: Przeniesiono z `app/page.tsx` w strukturę grupy route `app/(home)/page.tsx` w celu lepszej organizacji layoutów oraz dodano szkielety do ładowania m.in. stron z wyszukiwaniem (`search/loading.tsx`).

---

## Gdzie zmieniać parametry

To jest najważniejsza sekcja. Poniżej lista wszystkich "pokręteł" systemu i gdzie je znaleźć.

### Ile artykułów generować na raz
**Plik**: `src/app/api/cron/generate/route.ts` - stała w parametrach url ze spadachronem do configu z parsera.

### Logika Ewaluacji Artykułów / Minimum Punktów
**Plik**: `src/lib/ai/quality.ts` - skrypt analizujący. Punkty przypisywane za sekcje nagłówkowe słowa.

### Zmiana Źródeł RSS
**Plik**: `src/lib/scraper/sources.ts`

### Algorytm rankingu
**Plik**: `src/lib/scraper/parser.ts`, funkcja `selectTopArticles`.

### Kod Generowania i Wybór Modelów
**Plik**: `src/lib/ai/writer.ts` - zmiana ustawień `model` w API OpenRouter. 
Aktualnie działa `anthropic/claude-sonnet-4`.

### Konfiguracja i Kategoryzacje
Trzy miejsca połączone: baza Supabase `categories`, Frontend config `src/config/site.ts` oraz Prompt w `src/lib/ai/prompts.ts`.

---

## Szybki start

### 1. Instalacja

```bash
git clone <repo-url> && cd aifeed
npm install
```

### 2. Konfiguracja

Stwórz `.env.local` na wzór `.env.example`.
Zmienne obejmują Supabase (Url, Anon Key, Service Role Key), OpenRouter Api Key, Unsplash oraz Cron i NEXT_PUBLIC_SITE_URL.

### 3. Baza danych

Uruchom `supabase/schema.sql` w Supabase SQL Editor. 

### 4. Uruchomienie

```bash
npm run dev     # Dev server (port 3000)
npm run build   # Build produkcyjny
```

### 5. Ręczne generowanie i logowanie

```bash
curl -X POST http://localhost:3000/api/cron/generate \
  -H "Authorization: Bearer TWOJ_CRON_SECRET"
```

Oczekuj w logach z terminalu informacji o jakości artykułu z Quality Gate (np. `score: 85/100, issues: brak nagłówków sekcji`) i z podsumowaniem wydatków w tokenach za promptowanie z Claude.

---

## Struktura projektu

```text
src/
├── app/
│   ├── (home)/page.tsx           # Strona główna z paginacją
│   ├── layout.tsx                # Root layout
│   ├── article/[slug]/page.tsx   # Zaktualizowana strona artykułu
│   ├── category/[slug]/page.tsx  # Kategoria z listlistingiem paginowanym
│   ├── tag/[slug]/page.tsx       # Tagi 
│   ├── search/                     
│   ├── feed.xml/route.ts        # RSS feed
│   ├── sitemap.ts               # Mapa strony
│   └── api/
│       ├── cron/generate/route.ts  # <-- Pipeline backendowy z Quality Gate
│       └── search/route.ts         # API wyszukiwania
│
├── lib/
│   ├── scraper/
│   │   ├── sources.ts        
│   │   ├── content.ts        # <-- Nowe metody wyciągające treść url
│   │   └── parser.ts         
│   ├── ai/
│   │   ├── prompts.ts        
│   │   ├── quality.ts        # <-- Nowa mechanika weryfikacyjna wygenerowanych artykułów
│   │   └── writer.ts         
│   ├── images/generator.ts  
│   └── data.ts              
│
├── config/
│   └── site.ts               
│
└── components/
    ├── articles/              # Dodano Breadcrumbs, ReadingProgress, ShareButtons i kompozycje kategoryzacji
    ├── layout/               
    └── ui/                    # Paginacja i komponenty shadcn/ui
```

---

## Baza danych i Bezpieczeństwo
Używamy PostgreSQL z Supabase (w obiekcie `supabase/schema.sql`).
Zastosowano Row Level Security (RLS) - odczyt jako Publiczny, natomiast dodawanie tagów i artykułów wyłącznie poprzez klucz administracyjny z rąk pipeline Cron (`service_role` z `src/lib/supabase/admin.ts`).
