# Propozycje Dalszych Zmian i Ulepszeń

Poniżej lista propozycji rozwoju serwisu AiFeed, pogrupowana tematycznie. Priorytet: **P1** (krytyczne), **P2** (ważne), **P3** (nice-to-have).

---

## 1. Content Pipeline — Ulepszenia

### P1: Wielokrotne cykle generowania dziennie
Aktualnie pipeline uruchamia się raz dziennie (8:00 UTC). Dla serwisu informacyjnego optymalnie byłoby 3-4 razy dziennie (rano, południe, wieczór), aby treści były bardziej aktualne.

### P1: Prompt engineering i jakość artykułów
Obecne prompty generują artykuły w jednym stylu. Propozycje:
- Różne szablony per kategoria (artykuł badawczy vs. news vs. tutorial)
- Dodanie sekcji "kluczowe wnioski" (bullet points) na górze artykułu
- Lepsze zróżnicowanie excerptów (obecnie mock data mają identyczne)
- Generowanie meta description zoptymalizowanego pod SEO

### P2: Walidacja i moderacja treści
- Automatyczny filtr jakości (odrzucanie artykułów poniżej progu)
- System flagowania artykułów wymagających przeglądu
- Panel administracyjny do moderacji przed publikacją

### P2: Więcej źródeł RSS
Kandydaci na nowe źródła:
- Hugging Face Blog
- Anthropic Blog / Research
- DeepMind Blog
- arXiv (AI/ML daily digest)
- Polskie źródła: Niebezpiecznik (AI), Spider's Web, AntyWeb

### P3: Źródła nie-RSS
- Monitoring X/Twitter popularnych kont AI
- Scraping Product Hunt (kategoria AI)
- Newsletter parsing (Import AI, The Batch)

---

## 2. Frontend — Design i UX

### P1: Loading states i Suspense
Brak loading skeletonów na stronach. Propozycja:
- Skeleton components dla ArticleCard (każdy wariant)
- `loading.tsx` w `/app/`, `/app/article/[slug]/`, `/app/category/[slug]/`
- Streaming z Suspense dla ciężkich sekcji

### P1: Paginacja / Infinite scroll
Strona główna i kategorie pokazują stałą liczbę artykułów. Przy rosnącej ilości treści konieczne:
- Paginacja na stronach kategorii
- "Załaduj więcej" lub infinite scroll na homepage
- Cursor-based pagination w Supabase (wydajniejsza niż offset)

### P2: Widok artykułu — Table of Contents
Dla dłuższych artykułów (>1000 słów) automatyczny spis treści wygenerowany z nagłówków h2/h3, sticky na boku.

### P2: Udostępnianie artykułów
- Przyciski share: Twitter/X, LinkedIn, Facebook, kopiuj link
- Web Share API na mobile
- Kopiowanie cytatu z artykułu

### P2: Breadcrumbs
Nawigacja okruszkowa na stronach artykułów i kategorii. Korzystne dla SEO (JSON-LD BreadcrumbList).

### P2: Reading progress indicator
Pasek postępu czytania na górze strony artykułu (popularne w serwisach informacyjnych).

### P3: Animacje wejścia sekcji
Intersection Observer do animacji fade-in sekcji przy scrollowaniu (zamiast wszystkich naraz).

### P3: Tryb czytania
Przycisk "Focus mode" ukrywający header/footer/sidebar, zostawiający samą treść artykułu.

---

## 3. SEO i Performance

### P1: Obrazy — blur placeholder
`<Image placeholder="blur" blurDataURL="...">` — generowanie base64 blurred thumbnails przy uploading do Supabase lub w pipeline.

### P1: Canonical URLs i hreflang
- Explicit `<link rel="canonical">` na każdej stronie
- Przygotowanie pod wielojęzyczność (hreflang pl/en)

### P2: Structured Data rozszerzenie
- `BreadcrumbList` na stronach artykułów i kategorii
- `Organization` schema na stronie "O nas"
- `FAQPage` schema jeśli dodamy sekcję FAQ
- `ItemList` na stronie głównej (lista artykułów)

### P2: Core Web Vitals monitoring
- Integracja z Web Vitals API (`next/web-vitals`)
- Raportowanie do analytics (Vercel Analytics, Google Analytics 4)
- Monitoring LCP, FID, CLS

### P3: Service Worker / PWA
- Offline reading dla zapisanych artykułów
- Push notifications o nowych artykułach
- manifest.json + service worker

---

## 4. Funkcjonalności

### P1: Newsletter — real backend
Obecny formularz newslettera jest statyczny. Potrzebne:
- Integracja z Resend / Mailchimp / ConvertKit
- Potwierdzenie email (double opt-in)
- Automatyczny digest: dzienny/tygodniowy
- Strona unsubscribe

### P1: Panel administracyjny
Dashboard do:
- Przeglądu wygenerowanych artykułów (edycja, usuwanie, unpublish)
- Monitoringu pipeline (logi, błędy, statystyki)
- Zarządzania kategoriami i tagami
- Ręcznego triggera generowania

### P2: Analityka
- Licznik wyświetleń artykułów (Supabase RPC lub osobna tabela)
- Popularne artykuły (by views)
- Heatmapa kategorii
- Dashboard z metrykami

### P2: Komentarze
- System komentarzy (Supabase auth + tabela komentarzy)
- Lub integracja z Giscus (GitHub Discussions)
- Moderacja automatyczna

### P2: Bookmarki / Zapisane
- "Zapisz na później" z localStorage (bez auth)
- Lub Supabase auth + tabela bookmarks
- Strona /saved z listą zapisanych

### P3: System rekomendacji
- "Podobne artykuły" oparte na tagach i kategorii (już częściowo jest)
- Personalizacja na podstawie historii czytania (localStorage)

### P3: Wersja audio
- Text-to-speech (TTS) dla artykułów via API (ElevenLabs, OpenAI TTS)
- Player audio na stronie artykułu

---

## 5. Infrastruktura i DevOps

### P1: Error monitoring
- Sentry integration (Next.js SDK)
- Alerting na błędy pipeline (email/Slack)
- Structured logging

### P1: Rate limiting
- Rate limit na `/api/search` (np. 30 req/min)
- Rate limit na `/api/cron/generate` (poza autoryzacją Bearer)

### P2: Testy
- Unit testy: `vitest` dla data layer, scraper, ranking
- Integration testy: pipeline end-to-end z mock API
- E2E: Playwright dla krytycznych ścieżek (homepage → artykuł → szukaj)

### P2: CI/CD
- GitHub Actions: lint + typecheck + build na każdy PR
- Preview deployments (Vercel automatycznie)
- Automatyczne testy przed merge

### P3: Monitoring uptime
- Health check endpoint (już jest: `GET /api/cron/generate`)
- UptimeRobot / Better Uptime monitoring
- Status page

---

## 6. Monetyzacja (przyszłość)

### P3: Reklamy
- Dedykowane sloty reklamowe między sekcjami
- Komponent `<AdSlot>` z lazy loading
- Integracja Google AdSense / Carbon Ads

### P3: Premium content
- Limit darmowych artykułów (np. 10/miesiąc)
- Paywall z Stripe integration
- Newsletter premium tier

### P3: Sponsorowane artykuły
- Oznaczenie "Sponsorowane" w karcie artykułu
- Osobna kategoria / tag
- CMS panel dla sponsorów

---

## Priorytetyzacja

### Faza 1 — MVP produkcyjny (teraz)
- [x] Design system i strona główna
- [x] Pipeline treści
- [x] SEO fundamenty
- [ ] Loading states (P1)
- [ ] Newsletter backend (P1)
- [ ] Error monitoring (P1)

### Faza 2 — Wzrost
- [ ] Panel administracyjny (P1)
- [ ] Paginacja (P1)
- [ ] Więcej źródeł RSS (P2)
- [ ] Wielokrotne cykle dziennie (P1)
- [ ] Analityka (P2)

### Faza 3 — Skala
- [ ] Komentarze (P2)
- [ ] Bookmarki (P2)
- [ ] PWA / offline (P3)
- [ ] Monetyzacja (P3)
