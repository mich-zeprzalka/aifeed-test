import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Supabase Storage
      { protocol: "https", hostname: "iwseooszjbafasmjdiki.supabase.co" },
      // Common source domains
      { protocol: "https", hostname: "*.techcrunch.com" },
      { protocol: "https", hostname: "*.theverge.com" },
      { protocol: "https", hostname: "*.arstechnica.com" },
      { protocol: "https", hostname: "*.wired.com" },
      { protocol: "https", hostname: "*.venturebeat.com" },
      { protocol: "https", hostname: "*.openai.com" },
      { protocol: "https", hostname: "*.google.com" },
      { protocol: "https", hostname: "*.deepmind.com" },
      { protocol: "https", hostname: "*.microsoft.com" },
      { protocol: "https", hostname: "*.nvidia.com" },
      { protocol: "https", hostname: "*.anthropic.com" },
      { protocol: "https", hostname: "*.huggingface.co" },
      { protocol: "https", hostname: "*.spidersweb.pl" },
      { protocol: "https", hostname: "*.wp.com" },
      { protocol: "https", hostname: "*.medium.com" },
      { protocol: "https", hostname: "*.unsplash.com" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "*.imgur.com" },
      { protocol: "https", hostname: "*.cdn.sanity.io" },
      // Catch-all: the AI pipeline scrapes thumbnails from unpredictable RSS
      // sources, so a fixed whitelist will always have gaps. HTTPS-only.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
