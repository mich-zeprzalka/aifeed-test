import { Newspaper, Layers, Rss, Zap, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "O serwisie — AiFeed",
  description:
    "AiFeed to magazyn informacyjny o sztucznej inteligencji w języku polskim. Dowiedz się, co znajdziesz w serwisie i jak go najlepiej wykorzystać.",
  alternates: {
    canonical: "/o-serwisie",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10">
        <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          O serwisie
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
          O serwisie {siteConfig.name}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Polskojęzyczny magazyn informacyjny poświęcony sztucznej inteligencji — modelom,
          badaniom, narzędziom i wpływowi AI na rynek oraz społeczeństwo.
        </p>
      </header>

      {/* Section: Mission */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Nasza misja
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">
          Wiedza o AI w przystępnej formie
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {siteConfig.name} powstał z prostego założenia: tempo rozwoju sztucznej inteligencji jest
          tak szybkie, że trudno za nim nadążyć. Codziennie pojawiają się nowe modele, badania i
          narzędzia — ale większość informacji dostępna jest wyłącznie w języku angielskim,
          rozproszona po dziesiątkach blogów, portali i preprintów.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Naszym celem jest dostarczać czytelnikom wybrane, najważniejsze i najbardziej wartościowe
          informacje ze świata AI w języku polskim — w jednym miejscu, w przejrzystej formie i bez
          zbędnego szumu.
        </p>
      </section>

      {/* Section: What we cover */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Tematyka
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
          O czym piszemy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {siteConfig.categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/kategoria/${cat.slug}`}
              className="group flex flex-col gap-1 rounded-xl border border-border/40 bg-card/80 p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-sm"
            >
              <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          W liczbach
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
          {siteConfig.name} w skrócie
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Newspaper, value: "50+", label: "Artykułów tygodniowo" },
            { icon: Layers, value: `${siteConfig.categories.length}`, label: "Kategorii tematycznych" },
            { icon: Rss, value: "RSS", label: "Otwarty kanał" },
            { icon: Zap, value: "24/7", label: "Codzienne aktualizacje" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/40 bg-card/80 p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                <stat.icon className="size-5" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="text-xs font-mono tracking-wide text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Kontakt
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">
          Masz pytanie lub sugestię?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Chętnie usłyszymy od Ciebie. Jeśli zauważyłeś błąd, masz propozycję tematu, albo chcesz
          nawiązać współpracę — napisz do nas.
        </p>
        <a
          href="mailto:kontakt@aifeed.pl"
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:border-primary/40 hover:bg-card"
        >
          <Mail className="size-4" />
          kontakt@aifeed.pl
        </a>
      </section>
    </div>
  );
}
