import { ArrowRight, TrendingUp, Newspaper, Rss, Layers, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ArticleCard } from "@/components/articles/article-card";
import { CategoryBar } from "@/components/articles/category-bar";
import { siteConfig } from "@/config/site";
import {
  getArticles,
  getFeaturedArticles,
  getCategories,
  getArticlesGroupedByCategory,
  getPopularTags,
} from "@/lib/data";

export const revalidate = 300;

export default async function HomePage() {
  const categorySlugs = siteConfig.categories.slice(0, 4).map((c) => c.slug);

  const [categories, featured, allArticles, categoryArticles, trendingTags] = await Promise.all([
    getCategories(),
    getFeaturedArticles(),
    getArticles(12),
    getArticlesGroupedByCategory(categorySlugs, 4),
    getPopularTags(10),
  ]);

  const hero = featured[0];
  const sideFeatures = featured.slice(1, 5);
  const featuredIds = new Set(featured.map((f) => f.id));
  const gridArticles = allArticles.filter((a) => !featuredIds.has(a.id)).slice(0, 6);

  const categoryEntries = siteConfig.categories
    .slice(0, 4)
    .map((cat) => ({ ...cat, articles: categoryArticles[cat.slug] || [] }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <>
      <CategoryBar categories={categories} />

      {/* Trending Tags */}
      <div className="border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            <TrendingUp className="size-3.5" />
            Trendy
          </div>
          <div className="flex items-center gap-2">
            {trendingTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/search?q=${encodeURIComponent(tag.name)}`}
                className="shrink-0 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/60 transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {hero && (
            <div className="lg:col-span-7 xl:col-span-8 animate-fade-in-up">
              <ArticleCard article={hero} variant="featured" className="h-full min-h-[420px] lg:min-h-[520px]" />
            </div>
          )}

          <div className="flex flex-col lg:col-span-5 xl:col-span-4 h-full border border-border/50 bg-card rounded-xl divide-y divide-border/50">
            {sideFeatures.map((article, i) => (
              <div key={article.id} className={`animate-fade-in-up stagger-${i + 2} flex-1 p-3`}>
                <ArticleCard article={article} variant="compact" className="h-full hover:bg-transparent hover:border-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <hr className="my-10 border-border/40" />
      </div>

      {/* Latest Articles Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Najnowsze Publikacje
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gridArticles.map((article, i) => (
            <div key={article.id} className={`animate-fade-in-up stagger-${i + 1}`}>
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      </section>

      {/* Category Highlights — alternating layouts */}
      {categoryEntries.map((cat, catIndex) => {
        const lead = cat.articles[0];
        const side = cat.articles.slice(1, 4);

        return (
          <section key={cat.slug} className="border-t border-border/40">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              {/* Section header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">
                  {cat.name}
                </h2>
                <Link
                  href={`/category/${cat.slug}`}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                  <div className="flex flex-col gap-1 lg:col-span-5">
                    {side.map((article) => (
                      <ArticleCard key={article.id} article={article} variant="compact" />
                    ))}
                  </div>
                </div>
              ) : catIndex % 3 === 1 ? (
                /* Layout B: 4-column compact grid */
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {cat.articles.slice(0, 4).map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
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
                      <div className="p-4">
                        <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                          {article.title}
                        </h3>
                        <p className="mt-2 text-[11px] font-mono text-muted-foreground">
                          {new Date(article.published_at || "").toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Layout C: Featured wide card + 2-column grid below */
                <div className="space-y-5">
                  <ArticleCard article={lead} variant="featured" className="min-h-[280px] lg:min-h-[340px]" />
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

      {/* Newsletter CTA */}
      <section className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-4 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
              Newsletter
            </p>
            <h2 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance">
              Bądź krok przed innymi
            </h2>
            <p className="mb-8 text-muted-foreground text-[15px] leading-relaxed">
              Najważniejsze informacje ze świata AI, dostarczane rano. Zero spamu, czysta wartość.
            </p>
            <div className="flex items-center gap-2 mx-auto max-w-sm">
              <input
                type="email"
                placeholder="twoj@email.pl"
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
              />
              <button className="shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-foreground/90 transition-colors shadow-sm">
                Zapisz się
              </button>
            </div>
            <p className="mt-4 text-[11px] font-mono tracking-wide text-muted-foreground/60">
              Zawsze darmowe. Zrezygnuj w dowolnej chwili.
            </p>
          </div>
        </div>
      </section>

      {/* About / Stats */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                O serwisie
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance mb-4">
                Twoje codzienne źródło wiedzy o AI
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
                AiFeed automatycznie monitoruje najważniejsze źródła informacji o sztucznej inteligencji, generuje profesjonalne artykuły i dostarcza je w przystępnej formie. Codziennie, bez przerw.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Newspaper, value: "50+", label: "Artykułów tygodniowo" },
                { icon: Layers, value: "6", label: "Kategorii tematycznych" },
                { icon: Rss, value: "8", label: "Źródeł RSS" },
                { icon: Zap, value: "24/7", label: "Automatyczny monitoring" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/50 p-5 text-center"
                >
                  <stat.icon className="size-5 text-primary" />
                  <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                  <p className="text-[11px] font-mono tracking-wide text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteConfig.url}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </>
  );
}
