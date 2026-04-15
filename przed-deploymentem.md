# Checklista przed-deploymentem (Production Ready) 🚀

Zebrałem wszystkie niezbędne kwestie techniczne, architektoniczne oraz optymalizacyjne, które musisz sprawdzić **zanim** skierujesz na stronę ruch z wyszukiwarek (SEO) pierwszych użytkowników. Aplikacja w Next.js powiązana z tak zautomatyzowanym procesem to mocne narzędzie, z którym wiążą się pewne koszty lub braki, jeśli nie zamkniesz odpowiednich spraw.

---

## 1. Konfiguracja zmiennych środowiskowych (Vercel)
Twój plik `.env.local` na własnym komputerze wygląda okej, ale kiedy przerzucasz kod na serwery Vercela, te nie znają żadnego z Twoich haseł. Na pulpicie swojego projektu musisz bezwzględnie wypełnić okno **Environment Variables**.
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY` (Bez tego skrypt Vercel Cron wyrzuci błąd przy próbie zapisu).
* `OPENROUTER_API_KEY` (Klucz niezbędny do uderzeń w model Claude).
* `CRON_SECRET`
* `NEXT_PUBLIC_SITE_URL` (Krytyczne dla sitemap i poprawnych wyników w Google. Jeśli docelowa domena to np. `https://aifeed.pl`, to taką samą wartość z protokołem wpisz w Vercel ENV).

---

## 2. Ograniczenia i Koszty API
Przeanalizowałem Twój `route.ts` odpalający się z Crona.
* **Tryb testowy z licznikiem = 1**: W funkcji generującej masz teraz na sztywną `const topItems = selectTopArticles(newItems, 1);`. Aby w pełni realizowało się założenie generowania, na produkcji możesz to zmienić na `3` albo `5` - upewnij się, że ten koszt od wezwań tokenów Anthropic został przez Ciebie zaplanowany w limicie kart.
* **Zabezpieczenie przed Timeout'em**: Ustawiłeś `export const maxDuration = 300;` dla crona. Ustawienie to jest dostępne w płatnych/zaawansowanych tierach Vercela, więc upewnij się, że korzystasz w Vercelu z planu PRO. (Jeżeli jesteś na Hobby Tier, funkcja API nie może przekroczyć 10 sekund timeoutu. Scrapowanie wielu kanałów i czekanie na Claude'a często wymaga czasu 30 – 120 sek.). Możliwe rozwiązania dla planu Hobby: rozbić endpoint API na asynchonicznego consumera, wykorzystać Inngest lub przesiąść się na tańszy VPS po stronie backendowej logiki sztucznej inteligencji.

---

## 3. SEO (Kwestie Ostateczne)
Wprowadziliśmy Canonical Links i mapy sitemap pobierające po 5000 rekordów. Nie zapomnij również zgłosić się do Google:
1. **Google Search Console**: Podepnij `https://aifeed.pl` poprzez plik DNS, wyślij ping bezpośrednio z lokalizacją `/sitemap.xml`.
2. **Koniecznie sprawdź Vercel Image Optimization (WAŻNE)**: Ze względu na to, że wiele feedów wysyła obrazki bezpośrednio ze swoich domen - musieliśmy wrócić do `hostname: "**"`. Jest jeden szkopuł – w wersji darmowej Vercel optymalizowanie tysięcy nieskończonych wielkich obrazków pochodzących z całego świata gwałtownie zbliża się do darmowego limitu transferu i `Image Optimization Limit`. Czasem opłaca się przerabiać takie zdjęcia i wysyłać je z własnego Supabase w jednym z cron jobów (nazywane `Image caching / proxy proxying`), lub po prostu przejść na tańszego dostawcę hostingu jeśli aplikacja urośnie za bardzo i zaczniesz dopłacać za bandwidth Vercelowy.

---

## 4. Ochrona serwisu
Weryfikacja żądania dla cronu za pomocą `CRON_SECRET` odbywa się po nagłówku standardowym Bearer: 
`if (cronSecret && authHeader !== 'Bearer ' + cronSecret)` - to rewelacyjne rozwiązanie.
Warto upewnić się, że to tajne hasło widnieje we front-widgecie (jak widok ustawiania samego CRON-a na dashboardzie Vercela), domyślnie z resztą Next.js / Vercel automatycznie ustawiają nagłówek `Authorization`, gdy odpalają cron zdefiniowany w configu.

---

## 5. Podsumowanie logów (Zarządzanie Czasem Reakcji)
Aplikacja wysyła teraz liczne raporty do konsoli za pomocą `console.log`
Będąc na produkcji polecam wykorzystać chociażby darmowy pakiet narzędzia takiego jak np. **Sentry.io**, by mieć 100% monitoringu nad przerwaniami rzucanymi z serwera do przeglądarek w momencie, kiedy jakiś parser na serwerze nie da sobie rady i model rzuci wyjątkami przed ukończeniem pętli puszczając błędy `try...catch`.

Powodzenia! Aplikacja jest piękna i napisana rewelacyjnie, w gotzości do publikacji.  🚀
