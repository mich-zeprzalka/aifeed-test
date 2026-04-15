import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
                <span className="text-xs font-bold tracking-tight">Ai</span>
              </div>
              <span className="text-base font-bold tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
              Twoje codzienne źródło wiadomości o sztucznej inteligencji, badaniach i rynku. Wyselekcjonowane przez AI, zweryfikowane przez redaktorów.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Kategorie
            </h3>
            <ul className="space-y-2.5">
              {siteConfig.categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-[13px] text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Zasoby
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors">
                  O nas
                </Link>
              </li>
              <li>
                <Link
                  href="/feed.xml"
                  className="text-[13px] text-foreground/70 hover:text-foreground transition-colors"
                >
                  RSS Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[13px] text-foreground/70 hover:text-foreground transition-colors"
                >
                  Polityka Prywatności
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Bądź na bieżąco
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Odbieraj najnowsze wieści o AI każdego dnia.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="twoj@email.pl"
                className="flex-1 min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <button className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">
                Wyślij
              </button>
            </div>
          </div>
        </div>

        <hr className="my-10 border-border/40" />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[11px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Wygenerowane przez AI, zweryfikowane przez redaktorów.
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Pędzi na Next.js, Supabase & Claude
          </p>
        </div>
      </div>
    </footer>
  );
}
