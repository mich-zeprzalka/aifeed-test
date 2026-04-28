import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AiFeed — Wiadomości AI",
    short_name: "AiFeed",
    description: "Twoje codzienne źródło wiadomości o AI, nowości badawczych i insightów z branży.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#6366f1",
    lang: "pl",
    icons: [
      // URLs resolve to ImageResponse PNGs from app/icon-192/route.tsx and
      // app/icon-512/route.tsx. The folder names intentionally omit the
      // `.png` extension — Next.js' metadata file scanner can collide with
      // dot-extension folder names in dev mode and 500 the route.
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
