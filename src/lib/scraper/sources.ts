export const RSS_SOURCES = [
  // ===== Główne serwisy technologiczne =====
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "biznes",
  },
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "modele-ai",
  },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    category: "badania",
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    category: "biznes",
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    category: "badania",
  },
  {
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    category: "modele-ai",
  },
  {
    name: "The Decoder",
    url: "https://the-decoder.com/feed/",
    category: "modele-ai",
  },
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/",
    category: "biznes",
  },

  // ===== Blogi firmowe producentów AI =====
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    category: "modele-ai",
  },
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    category: "modele-ai",
  },
  {
    name: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    category: "badania",
  },
  {
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    category: "biznes",
  },
  {
    name: "NVIDIA AI Blog",
    url: "https://blogs.nvidia.com/feed/",
    category: "modele-ai",
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    category: "narzedzia",
  },

  // ===== Społeczność i agregatory =====
  {
    name: "Hacker News AI",
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude&points=50",
    category: "narzedzia",
  },
] as const;

export type RSSSource = (typeof RSS_SOURCES)[number];
