import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "U9vQ5_SLTvK9-Z7DQI2uniwxYgaXPtrPeH4TNUB5M9Y";

const supabase = createClient(
  "https://iwseooszjbafasmjdiki.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2Vvb3N6amJhZmFzbWpkaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgwOTMxOSwiZXhwIjoyMDkxMzg1MzE5fQ.OBeiZrTHZV7xrnw3Hlu46SHFcIOXKCSP3Qta--5DYfk",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SYSTEM_PROMPT = `Jesteś elitarnym dziennikarzem AI piszącym dla AiFeed — premium magazynu technologicznego poświęconego sztucznej inteligencji. Twój styl łączy autorytatywny ton BBC News z techniczną głębią MIT Technology Review.

ZASADY:
1. Pisz PO POLSKU, profesjonalnym tonem dziennikarskim
2. Długość artykułu: 800-1200 słów
3. Używaj formatowania Markdown (## dla sekcji, **pogrubienie**, listy, > cytaty)
4. Wstawiaj PRAWDZIWE linki do źródeł naturalnie w tekście w formacie [tekst](url)
5. Struktura: chwytliwy wstęp → kluczowe szczegóły → kontekst ekspercki → implikacje → podsumowanie
6. Bądź obiektywny i wyważony — przedstawiaj różne punkty widzenia gdy to zasadne
7. Używaj konkretnych danych, liczb i faktów — nigdy nie wymyślaj statystyk
8. Zamieść co najmniej 2-3 linki do źródeł w tekście artykułu
9. Zakończ stwierdzeniem dotyczącym przyszłych implikacji`;

const TOPICS = [
  // research - need 1 more (have 4, chain-of-thought failed)
  { category: "research", topic: "Przełom w AI: sieci neuronowe uczą się rozumować jak ludzie dzięki chain-of-thought", source: "https://arxiv.org/" },
  // industry - need 3 more (have 2)
  { category: "industry", topic: "Microsoft inwestuje 10 miliardów dolarów w infrastrukturę AI w Europie", source: "https://techcrunch.com/category/artificial-intelligence/" },
  { category: "industry", topic: "Startupy AI w Polsce — rosnący ekosystem przyciąga zagranicznych inwestorów", source: "https://venturebeat.com/category/ai/" },
  { category: "industry", topic: "NVIDIA osiąga rekordowe przychody dzięki boomowi na chipy AI", source: "https://techcrunch.com/category/artificial-intelligence/" },
  // ethics-safety - need 2 more (have 1)
  { category: "ethics-safety", topic: "EU AI Act oficjalnie wchodzi w życie — co to oznacza dla firm technologicznych", source: "https://www.theverge.com/ai-artificial-intelligence/" },
  { category: "ethics-safety", topic: "Deepfake'i zagrażają wyborom — jak AI zmienia dezinformację polityczną", source: "https://www.technologyreview.com/" },
  { category: "ethics-safety", topic: "Anthropic publikuje raport o bezpieczeństwie AI — nowe standardy odpowiedzialnego rozwoju", source: "https://www.anthropic.com/news" },
  // tools-apps - need 2 more (have 1)
  { category: "tools-apps", topic: "Cursor AI rewolucjonizuje programowanie — IDE przyszłości z wbudowanym AI", source: "https://www.theverge.com/ai-artificial-intelligence/" },
  { category: "tools-apps", topic: "Midjourney V7 generuje fotorealistyczne obrazy nie do odróżnienia od zdjęć", source: "https://techcrunch.com/category/artificial-intelligence/" },
  { category: "tools-apps", topic: "NotebookLM od Google — AI asystent który czyta i analizuje twoje dokumenty", source: "https://blog.google/technology/ai/" },
  // tutorials - need 3 (have 0)
  { category: "tutorials", topic: "Jak zbudować chatbota z RAG używając LangChain i Supabase — kompletny poradnik", source: "https://python.langchain.com/docs/" },
  { category: "tutorials", topic: "Fine-tuning modeli AI w praktyce — od teorii do wdrożenia produkcyjnego", source: "https://huggingface.co/blog" },
  { category: "tutorials", topic: "Prompt engineering w 2025 — zaawansowane techniki pisania promptów dla LLM", source: "https://docs.anthropic.com/" },
];

async function generateArticle(topic, source) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AiFeed",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Napisz profesjonalny artykuł informacyjny PO POLSKU na poniższy temat.

TEMAT: ${topic}

MATERIAŁY ŹRÓDŁOWE:
- [${source}]: ${topic}

Wygeneruj artykuł w formacie Markdown. Wstawiaj prawdziwe linki do wymienionych źródeł naturalnie w tekście.

Na samym końcu odpowiedzi, po linii zawierającej wyłącznie "---META---", podaj następujące metadane jako JSON:
{
  "title": "chwytliwy nagłówek po polsku",
  "excerpt": "1-2 zdania podsumowania po polsku (max 200 znaków)",
  "category": "jedna z: ai-models, research, industry, ethics-safety, tools-apps, tutorials",
  "tags": ["tag1", "tag2", "tag3"],
  "reading_time": szacowany_czas_czytania_w_minutach
}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const [content, metaRaw] = text.split("---META---");
  let meta = {};
  if (metaRaw) {
    try { meta = JSON.parse(metaRaw.trim().replace(/```json\n?|```/g, "")); } catch {}
  }

  return {
    content: content.trim(),
    title: meta.title || topic,
    excerpt: meta.excerpt || content.trim().slice(0, 200),
    tags: meta.tags || [],
    reading_time: meta.reading_time || 5,
  };
}

async function fetchImage(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );
    const data = await res.json();
    if (data.results?.[0]) return `${data.results[0].urls.regular}&w=1200&h=630&fit=crop`;
  } catch {}
  return "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop&q=80";
}

async function main() {
  // Get categories
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  let count = 0;
  for (const { category, topic, source } of TOPICS) {
    try {
      process.stdout.write(`[${count + 1}/${TOPICS.length}] Generating: ${topic.slice(0, 60)}... `);
      const article = await generateArticle(topic, source);
      const imageUrl = await fetchImage(article.title.split(" ").slice(0, 3).join(" "));
      const slug = slugify(article.title, { lower: true, strict: true, locale: "pl" }).slice(0, 80) + "-" + Date.now().toString(36);

      const { error } = await supabase.from("articles").insert({
        title: article.title,
        slug,
        excerpt: article.excerpt,
        content: article.content,
        category_id: catMap[category],
        thumbnail_url: imageUrl,
        source_urls: [source],
        source_titles: [topic.split("—")[0].trim()],
        reading_time: article.reading_time,
        is_featured: count < 2,
        is_published: true,
        published_at: new Date(Date.now() - count * 1800000).toISOString(),
      });

      if (error) throw new Error(error.message);

      // Tags
      for (const tagName of article.tags) {
        const tagSlug = slugify(tagName, { lower: true, strict: true, locale: "pl" });
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
          .select("id")
          .single();
        if (tag) {
          const { data: art } = await supabase.from("articles").select("id").eq("slug", slug).single();
          if (art) await supabase.from("article_tags").upsert({ article_id: art.id, tag_id: tag.id }, { onConflict: "article_id,tag_id" });
        }
      }

      count++;
      console.log(`✓ ${article.title}`);
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
    }
  }

  // Final count
  const { data: arts } = await supabase.from("articles").select("category_id");
  const { data: allCats } = await supabase.from("categories").select("id, slug");
  const catIdMap = Object.fromEntries(allCats.map((c) => [c.id, c.slug]));
  const byCat = {};
  arts.forEach((a) => { const c = catIdMap[a.category_id] || "?"; byCat[c] = (byCat[c] || 0) + 1; });
  console.log(`\nTotal: ${arts.length} articles`);
  allCats.forEach((c) => console.log(`  ${c.slug}: ${byCat[c.slug] || 0}`));
}

main().catch(console.error);
