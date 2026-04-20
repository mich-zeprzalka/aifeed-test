export const siteConfig = {
  name: "AiFeed",
  description:
    "Twoje codzienne źródło wiadomości o AI, nowości badawczych i insightów z branży. Zasilane sztuczną inteligencją.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://aifeed.pl",
  ogImage: "/og-image.png",
  links: {
    twitter: "https://twitter.com/aifeed",
    github: "https://github.com/aifeed",
  },
  categories: [
    { name: "Modele AI", slug: "modele-ai", color: "#6366f1", description: "Premiery, aktualizacje i porównania modeli AI" },
    { name: "Badania i Nauka", slug: "badania", color: "#8b5cf6", description: "Przełomowe badania naukowe i odkrycia w dziedzinie AI" },
    { name: "Biznes i Rynek", slug: "biznes", color: "#06b6d4", description: "AI w biznesie, startupy, inwestycje i rynek technologiczny" },
    { name: "Etyka i Bezpieczeństwo", slug: "etyka", color: "#f59e0b", description: "Regulacje, etyka AI, alignment i bezpieczeństwo systemów AI" },
    { name: "Narzędzia i Aplikacje", slug: "narzedzia", color: "#10b981", description: "Nowe narzędzia, aplikacje i platformy wykorzystujące AI" },
    { name: "Poradniki", slug: "poradniki", color: "#ec4899", description: "Praktyczne tutoriale, przewodniki i porady dotyczące AI" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
