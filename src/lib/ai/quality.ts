import type { GeneratedArticle } from "./writer";

interface QualityResult {
  score: number;
  issues: string[];
}

/**
 * Scores a generated article on structural quality and completeness.
 * Returns a score 0-100 and a list of issues found.
 * Articles scoring below 50 should be rejected by the pipeline.
 */
export function assessArticleQuality(article: GeneratedArticle): QualityResult {
  const issues: string[] = [];
  let score = 100;

  // --- Content checks ---

  // "Kluczowe wnioski" section is mandatory
  const hasKeyTakeaways = /##\s*(kluczowe|najważniejsze|główne)\s*(wnioski|punkty|informacje)/i.test(
    article.content
  );
  if (!hasKeyTakeaways) {
    score -= 15;
    issues.push("brak sekcji kluczowych wniosków");
  }

  // Source link must be present (markdown link format)
  const hasSourceLink = /\[.+?\]\(https?:\/\/.+?\)/.test(article.content);
  if (!hasSourceLink) {
    score -= 25;
    issues.push("brak linku do źródła");
  }

  // Word count — minimum 200 words for a publishable article
  const wordCount = article.content.split(/\s+/).length;
  if (wordCount < 100) {
    score -= 35;
    issues.push(`za krótki: ${wordCount} słów`);
  } else if (wordCount < 200) {
    score -= 20;
    issues.push(`krótki: ${wordCount} słów`);
  }

  // At least one ## heading (structural requirement)
  const headingCount = (article.content.match(/^##\s/gm) || []).length;
  if (headingCount === 0) {
    score -= 10;
    issues.push("brak nagłówków sekcji");
  }

  // --- Metadata checks ---

  if (!article.title || article.title.length < 15) {
    score -= 15;
    issues.push("tytuł za krótki lub brak");
  }

  if (!article.excerpt || article.excerpt.length < 50) {
    score -= 10;
    issues.push("excerpt za krótki lub brak");
  }

  if (!article.tags || article.tags.length < 2) {
    score -= 5;
    issues.push("za mało tagów");
  }

  const validCategories = ["modele-ai", "badania", "biznes", "etyka", "narzedzia", "poradniki"];
  if (!validCategories.includes(article.category)) {
    score -= 10;
    issues.push(`nieznana kategoria: ${article.category}`);
  }

  return { score: Math.max(0, score), issues };
}
