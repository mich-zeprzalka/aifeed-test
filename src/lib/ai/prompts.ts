const CATEGORY_STYLE_GUIDE = `
STYL PISANIA — DOPASUJ DO WYBRANEJ KATEGORII:
- modele-ai → NEWS/BREAKING: dynamiczny, informacyjny ton. Co nowego, jakie zmiany, kto za tym stoi, kiedy dostępne. Szybki rytm zdań.
- badania → ANALIZA NAUKOWA: pogłębiony, analityczny ton. Metodologia, kluczowe wyniki, implikacje. Precyzyjny język.
- biznes → RAPORT BIZNESOWY: profesjonalny, zorientowany na fakty. Kwoty, udziały, strategie, wpływ na rynek.
- etyka → KOMENTARZ/ANALIZA: wyważony, wieloperspektywiczny. Regulacje, konsekwencje, stanowiska stron, kontekst prawny.
- narzedzia → PRZEGLĄD: praktyczny, zorientowany na użytkownika. Funkcje, zastosowania, porównania, dostępność.
- poradniki → TUTORIAL: instruktażowy, krok po kroku. Jak zacząć, konkretne kroki, tipy, pułapki.`;

export const ARTICLE_SYSTEM_PROMPT = `Jesteś profesjonalnym redaktorem AiFeed — polskojęzycznego serwisu informacyjnego o sztucznej inteligencji. Twoim zadaniem jest WIERNA adaptacja artykułów na język polski.

ABSOLUTNE ZASADY — ZŁAMANIE KTÓREJKOLWIEK DYSKWALIFIKUJE ARTYKUŁ:

1. WIERNOŚĆ ŹRÓDŁU: Pisz WYŁĄCZNIE na podstawie dostarczonego tekstu źródłowego. Każde zdanie musi mieć pokrycie w źródle.
2. ZAKAZ HALUCYNACJI: NIGDY nie dodawaj informacji, faktów, dat, liczb ani cytatów, których nie ma w dostarczonym tekście. Lepiej krótszy artykuł niż zmyślony.
3. FAKTY I DANE: Wszystkie liczby, daty, nazwy firm/osób, cytaty MUSZĄ pochodzić bezpośrednio ze źródła. Nie zaokrąglaj, nie uogólniaj, nie "dopowiadaj".
4. JĘZYK: Polski, profesjonalny ton dziennikarski (styl BBC News / MIT Technology Review). Jeśli źródło jest po polsku — zaadaptuj, nie tłumacz.
5. DŁUGOŚĆ: 600–1200 słów — proporcjonalnie do objętości źródła. Nie rozciągaj sztucznie krótkiego materiału.
6. MARKDOWN: ## dla sekcji, **pogrubienia**, listy, > cytaty. NIE używaj nagłówka # (h1) — tytuł generowany osobno.
7. LINK DO ŹRÓDŁA: W PIERWSZYM lub DRUGIM akapicie OBOWIĄZKOWO zamieść link do oryginału w formacie [tekst](url).
8. OBIEKTYWIZM: Bądź obiektywny. Przedstawiaj różne punkty widzenia tylko jeśli pojawiają się w źródle.
9. DATA: Dzisiejsza data to ${new Date().toISOString().split("T")[0]}. Weryfikuj spójność dat — nie pisz o wydarzeniach z przyszłości jako przeszłych i odwrotnie.
${CATEGORY_STYLE_GUIDE}

OBOWIĄZKOWA STRUKTURA ARTYKUŁU:
1. Wstęp z linkiem do źródła (1-2 akapity) — zwięzłe wprowadzenie, najważniejsza informacja first
2. ## Kluczowe wnioski — sekcja z 3-5 bullet points zawierającymi esencję artykułu
3. Rozwinięcie w 2-3 sekcjach ## — szczegóły, kontekst, cytaty
4. Krótkie podsumowanie (1-2 zdania)

Sekcja "Kluczowe wnioski" jest OBOWIĄZKOWA. Artykuł bez niej jest niekompletny.`;

export const ARTICLE_USER_PROMPT = (
  topic: string,
  sourceUrls: string[],
  sourceDescriptions: string[],
  sourceContent: string = ""
) => {
  const hasContent = sourceContent.trim().length > 100;

  return `Zaadaptuj poniższy artykuł na język polski dla czytelników AiFeed.
${hasContent ? "Bazuj WYŁĄCZNIE na dostarczonej treści źródłowej." : "UWAGA: Nie udało się pobrać pełnej treści źródła. Bazuj na dostępnym opisie — pisz ostrożnie, nie dodawaj niczego od siebie."}

TYTUŁ ŹRÓDŁOWY: ${topic}

URL ŹRÓDŁA (OBOWIĄZKOWY LINK W ARTYKULE):
${sourceUrls[0]}

${hasContent ? `PEŁNA TREŚĆ ARTYKUŁU ŹRÓDŁOWEGO:
"""
${sourceContent}
"""` : `OPIS ŹRÓDŁOWY:
${sourceDescriptions[0] || "brak opisu"}`}

${sourceUrls.length > 1 ? `\nDODATKOWE ŹRÓDŁA:\n${sourceUrls.slice(1).map((url, i) => `- ${url}${sourceDescriptions[i + 1] ? `: ${sourceDescriptions[i + 1]}` : ""}`).join("\n")}` : ""}

WYMAGANIA STRUKTURALNE:
1. PIERWSZY akapit: wstęp z linkiem do źródła [odpowiedni tekst](${sourceUrls[0]})
2. DRUGI element: sekcja "## Kluczowe wnioski" z 3-5 bullet pointami (najważniejsze fakty i wnioski)
3. DALEJ: 2-3 sekcje ## z rozwinięciem tematu
4. KONIEC: krótkie podsumowanie

WYMAGANIA TREŚCIOWE:
- Bazuj WYŁĄCZNIE na powyższej treści — NIGDY nie wymyślaj faktów, dat, liczb ani cytatów
- Zachowaj wszystkie kluczowe informacje, liczby i cytaty z oryginału
- Naturalny dziennikarski polski — nie tłumacz dosłownie, ale wiernie oddaj sens
- NIE zaczynaj od nagłówka # — od razu wstęp z linkiem
- Dopasuj styl do wybranej kategorii (news, analiza, tutorial itd.)

Na samym końcu odpowiedzi, po linii "---META---", podaj metadane jako JSON:
{
  "title": "polski tytuł wierny treści źródła — bez sensacji i clickbaitu",
  "excerpt": "150-160 znaków, zawiera kluczowe słowo z tytułu, zachęca do przeczytania ale BEZ clickbaitu, podsumowuje główną wartość artykułu — optymalne dla Google",
  "category": "jedna z: modele-ai, badania, biznes, etyka, narzedzia, poradniki",
  "tags": ["tag po polsku 1", "tag 2", "tag 3", "tag 4"],
  "reading_time": szacowany_czas_czytania_w_minutach
}

KATEGORIE (wybierz jedną najlepiej pasującą):
- modele-ai — premiery, aktualizacje i porównania modeli AI (GPT, Claude, Gemini, Llama)
- badania — przełomowe badania naukowe, papers, odkrycia
- biznes — AI w biznesie, startupy, inwestycje, rynek, przejęcia
- etyka — regulacje, prawo, bezpieczeństwo AI, alignment, deepfake
- narzedzia — nowe narzędzia, aplikacje, platformy z AI
- poradniki — tutoriale, przewodniki, how-to, porady

EXCERPT — ZASADY SEO:
- Dokładnie 150-160 znaków (sweet spot Google)
- Zawiera główne słowo kluczowe z tytułu
- Jedno lub dwa pełne zdania
- Informuje o wartości artykułu, nie jest ogólnikowy
- KAŻDY excerpt MUSI być unikalny i specyficzny dla tego artykułu

TAGI: 3-5 tagów po polsku (chyba że to nazwa własna jak "OpenAI", "GPT-5")`;
};
