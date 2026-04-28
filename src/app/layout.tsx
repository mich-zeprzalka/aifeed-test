import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { NewsTicker } from "@/components/layout/news-ticker";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { CategoryBar } from "@/components/articles/category-bar";
import { siteConfig } from "@/config/site";
import { getCategories, getTickerArticles } from "@/lib/data";
import { jsonLdScript } from "@/lib/jsonld";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// `latin-ext` adds Polish diacritics (ą, ę, ł, ó, ś, ź, ż). Without it the
// browser silently falls back to a system font for those glyphs, which produces
// inconsistent kerning and weights — easy to miss until a designer notices.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const fontHeading = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Wiadomości AI, Badania i Raporty`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: `${siteConfig.name} — RSS` }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [tickerItems, categories] = await Promise.all([
    getTickerArticles(10),
    getCategories(),
  ]);

  // `sameAs` should only list verified, owned social profiles. Until those
  // accounts exist the field is omitted entirely — pointing schema.org at
  // 404s damages structured-data trust signals (Google flags it).
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    description: siteConfig.description,
  };

  return (
    <html
      lang="pl"
      className={`${inter.variable} ${fontHeading.variable} ${fontMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to Supabase Storage — every article hero image hits this
            host. Saves DNS + TLS handshake on the LCP image. */}
        <link rel="preconnect" href="https://iwseooszjbafasmjdiki.supabase.co" />
        <link rel="dns-prefetch" href="https://iwseooszjbafasmjdiki.supabase.co" />

        {/* Mobile browser chrome (Safari URL bar) follows theme. Two values
            for light/dark so the bar matches the user's actual rendered theme
            instead of a single neutral color. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafafa" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1c1d2e" />

        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("theme"),d=window.matchMedia("(prefers-color-scheme:dark)").matches;if(t==="dark"||(t!=="light"&&d))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Przejdź do treści
        </a>
        <ScrollToTop />
        <NewsTicker items={tickerItems} />
        <Header />
        <CategoryBar categories={categories} />
        <main id="main-content" className="flex-1">{children}</main>
        <GoogleAnalytics gaId="G-5SD17PTF0C" />
        <Analytics />
        <Footer />
      </body>
    </html>
  );
}
