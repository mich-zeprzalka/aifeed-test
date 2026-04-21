import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wyszukiwarka",
  description: "Przeszukaj artykuły AiFeed — wiadomości AI, modele, badania, raporty.",
  alternates: {
    canonical: "/search",
  },
  // Search result pages have thin, query-dependent content. We let the
  // canonical page stay discoverable but tell crawlers not to index the
  // query-string variants — prevents Google from spawning entries for
  // arbitrary search terms in the SERP.
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
