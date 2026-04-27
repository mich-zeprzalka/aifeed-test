import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ArticleCard } from "@/components/articles/article-card";
import { siteConfig } from "@/config/site";
import {
  getArticlesGroupedByCategory,
  getPopularTags,
} from "@/lib/data";
import { jsonLdScript } from "@/lib/jsonld";

import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 300;

// How many articles to fetch per category. Enough to fill the hero slot (1)
// plus the per-category section below (up to 4) without re-querying.
const PER_CATEGORY = 6;

export default async function HomePage() {
  const allCategories = siteConfig.categories;
  const categorySlugs = allCategories.map((c) => c.slug);

  const [categoryArticles, trendingTags] = await Promise.all([
    getArticlesGroupedByCategory(categorySlugs, PER_CATEGORY),
    getPopularTags(10),
  ]);

  // Hero = the latest article from each of the first 5 categories. The 6th
  // category surfaces in its own dedicated section below to avoid duplication.
  const heroPicks = allCategories
    .slice(0, 5)
    .map((cat) => (categoryArticles[cat.slug] || [])[0])
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const hero = heroPicks[0];
  const sideFeatures = heroPicks.slice(1, 5);
  const heroIds = new Set(heroPicks.map((a) => a.id));

  // Each section excludes whatever already appears in the hero, so a reader
  // never sees the same article twice on the home page.
  const categoryEntries = allCategories
    .map((cat) => ({
      ...cat,
      articles: (categoryArticles[cat.slug] || []).filter((a) => !heroIds.has(a.id)),
    }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <>
      <h1 className="sr-only">AiFeed — Wiadomości AI, Badania i Raporty</h1>

      {/* Trending Tags */}
      {trendingTags.length > 0 && (
        <div className="border-b border-border/30">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex shrink-0 items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              <TrendingUp className="size-3" />
              Trendy
            </div>
            <div className="flex items-center gap-2">
              {trendingTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="shrink-0 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <span className="text-primary/60 mr-0.5">#</span>{tag.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero — 1 latest article from each of the top 5 categories */}
      {hero && (
        <section className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 xl:col-span-8 animate-fade-in-up">
              <ArticleCard article={hero} variant="featured" className="h-full min-h-[360px] lg:min-h-[480px]" />
            </div>

            {sideFeatures.length > 0 && (
              <div className="flex flex-col lg:col-span-5 xl:col-span-4 h-full border border-border/50 bg-card rounded-xl divide-y divide-border/50">
                {sideFeatures.map((article, i) => (
                  <div key={article.id} className={`animate-fade-in-up stagger-${i + 2} flex-1 p-3`}>
                    <ArticleCard article={article} variant="compact" className="h-full hover:bg-transparent hover:border-transparent" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Category sections — each shows the latest from a single category,
          alternating layouts for visual rhythm. */}
      {categoryEntries.map((cat, catIndex) => {
        const lead = cat.articles[0];
        const side = cat.articles.slice(1, 4);

        return (
          <section key={cat.slug} className="border-t border-border/40">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">
                  {cat.name}
                </h2>
                <Link
                  href={`/kategoria/${cat.slug}`}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Wszystkie <ArrowRight className="size-3" />
                </Link>
              </div>

              {catIndex % 3 === 0 ? (
                /* Layout A: Lead default card + side compact cards */
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <ArticleCard article={lead} className="h-full" />
                  </div>
                  {side.length > 0 && (
                    <div className="flex flex-col gap-1 lg:col-span-5">
                      {side.map((article) => (
                        <ArticleCard key={article.id} article={article} variant="compact" />
                      ))}
                    </div>
                  )}
                </div>
              ) : catIndex % 3 === 1 ? (
                /* Layout B: 4-column compact grid */
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {cat.articles.slice(0, 4).map((article) => (
                    <Link
                      key={article.id}
                      href={`/artykul/${article.slug}`}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card card-hover"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        {article.thumbnail_url ? (
                          <Image
                            src={article.thumbnail_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                          {article.title}
                        </h3>
                        <p className="mt-2 text-xs font-mono text-muted-foreground">
                          {new Date(article.published_at || "").toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Layout C: Featured wide card + grid below */
                <div className="space-y-5">
                  <ArticleCard article={lead} variant="featured" className="min-h-[240px] lg:min-h-[300px]" />
                  {side.length > 0 && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {side.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteConfig.url}/szukaj?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </>
  );
}
