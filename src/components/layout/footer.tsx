import Link from "next/link";
import { siteConfig } from "@/config/site";
import { NewsletterForm } from "./newsletter-form";

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
                aifeed<span className="text-primary">.</span>
              </span>
            </Link>
            <p className="text-body-sm text-muted-foreground leading-relaxed max-w-xs">
              Twoje codzienne źródło wiadomości o sztucznej inteligencji, badaniach i rynku. Wyselekcjonowane przez AI, zweryfikowane przez redaktorów.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-muted-foreground">
              Kategorie
            </h3>
            <ul className="space-y-2.5">
              {siteConfig.categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-body-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-muted-foreground">
              Zasoby
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-body-sm text-foreground/70 hover:text-foreground transition-colors">
                  O nas
                </Link>
              </li>
              <li>
                <Link
                  href="/feed.xml"
                  className="text-body-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  RSS Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-body-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  Polityka Prywatności
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="overflow-hidden">
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-muted-foreground">
              Bądź na bieżąco
            </h3>
            <p className="text-body-sm text-muted-foreground mb-4">
              Odbieraj najnowsze wieści o AI każdego dnia.
            </p>
            <NewsletterForm variant="compact" />
          </div>
        </div>

        <hr className="my-10 border-border/40" />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-label text-muted-foreground/60">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Wygenerowane przez AI, zweryfikowane przez redaktorów.
          </p>
          <p className="text-label text-muted-foreground/60">
            Pędzi na Next.js, Supabase & Claude
          </p>
        </div>
      </div>
    </footer>
  );
}
