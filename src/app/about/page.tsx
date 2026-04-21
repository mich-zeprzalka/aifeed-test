import { Newspaper, Layers, Rss, Zap, Cpu, Database, Bot, Paintbrush } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O serwisie — AiFeed",
  description:
    "AiFeed to w pełni zautomatyzowany serwis informacyjny o sztucznej inteligencji. Dowiedz się, jak działa nasz pipeline i jakie technologie napędzają serwis.",
  alternates: {
    canonical: "/about",
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
          O serwisie AiFeed
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Pierwszy w Polsce w pełni zautomatyzowany magazyn informacyjny o sztucznej inteligencji.
          Bez redakcji, bez opóźnień — tylko AI, dane i algorytmy pracujące 24 godziny na dobę.
        </p>
      </header>

      {/* Section: What is AiFeed */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Czym jest AiFeed
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">
          Zautomatyzowany pipeline informacyjny
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          AiFeed to serwis, który samodzielnie monitoruje dziesiątki źródeł informacji ze świata AI,
          selekcjonuje najważniejsze newsy, a następnie generuje kompletne artykuły w języku polskim.
          Każdy tekst jest wzbogacany o miniaturki, tagi i kategoryzację — bez jakiejkolwiek
          ludzkiej interwencji.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Serwis powstał z przekonania, że informacje o sztucznej inteligencji powinny docierać
          do polskojęzycznych czytelników szybko, w przystępnej formie i bez barier językowych.
          Zamiast czekać na tłumaczenia czy streszczenia — dostarczamy je automatycznie.
        </p>
      </section>

      {/* Section: How it works */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Jak to działa
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
          Od źródła do publikacji w 4 krokach
        </h2>
        <div className="space-y-6">
          {[
            {
              step: "01",
              title: "Monitorowanie źródeł RSS",
              description:
                "Pipeline nieustannie skanuje 20 kanałów RSS — blogi badawcze, portale technologiczne, repozytoria arXiv i oficjalne ogłoszenia firm AI.",
            },
            {
              step: "02",
              title: "Analiza i selekcja przez AI",
              description:
                "Zebrane materiały są analizowane pod kątem istotności, nowości i wartości informacyjnej. AI odrzuca duplikaty i szum, wybierając tylko najważniejsze tematy.",
            },
            {
              step: "03",
              title: "Generowanie artykułów",
              description:
                "Na podstawie wyselekcjonowanych źródeł AI tworzy pełne artykuły w języku polskim — z tytułem, leadem, treścią, tagami i kategoryzacją.",
            },
            {
              step: "04",
              title: "Publikacja na stronie",
              description:
                "Gotowe artykuły z wygenerowanymi miniaturkami trafiają automatycznie na stronę, dostępne dla czytelników w ciągu minut od pojawienia się informacji.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-mono font-bold text-primary">
                {item.step}
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Technology Stack */}
      <section className="mb-10">
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          Technologia
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
          Stack technologiczny
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Cpu,
              name: "Next.js",
              description: "Framework frontendowy z SSR i optymalizacją wydajności",
            },
            {
              icon: Database,
              name: "Supabase",
              description: "Baza danych PostgreSQL z real-time API i autentykacją",
            },
            {
              icon: Bot,
              name: "Claude AI",
              description: "Model językowy do analizy, selekcji i generowania treści",
            },
            {
              icon: Paintbrush,
              name: "Tailwind CSS",
              description: "System stylowania zapewniający spójny, responsywny design",
            },
          ].map((tech) => (
            <div
              key={tech.name}
              className="group flex gap-3 rounded-xl border border-border/40 bg-card/80 p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                <tech.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{tech.name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                  {tech.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
          W liczbach
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-6">
          AiFeed w liczbach
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Newspaper, value: "50+", label: "Artykułów tygodniowo" },
            { icon: Layers, value: "6", label: "Kategorii tematycznych" },
            { icon: Rss, value: "20", label: "Źródeł RSS" },
            { icon: Zap, value: "24/7", label: "Automatyczny monitoring" },
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
    </div>
  );
}
