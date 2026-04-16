# Propozycje Dalszych Zmian i Ulepszeń

Poniżej lista propozycji rozwoju serwisu AiFeed, pogrupowana tematycznie. Priorytet: **P1** (krytyczne), **P2** (ważne), **P3** (nice-to-have).




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
