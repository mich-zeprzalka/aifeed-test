import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";

export interface ThumbnailResult {
  url: string;
  source: string | null; // null = AI-generated, string = source site attribution
}

/**
 * Two-step thumbnail strategy:
 * 1. Scrape og:image from source article (FREE)
 * 2. Generate with AI via OpenRouter as fallback (paid)
 */
export async function getArticleThumbnail(
  title: string,
  sourceUrl: string,
  sourceName: string
): Promise<ThumbnailResult> {
  // Step 1: Try scraping og:image from source (free)
  console.log("[Thumbnail] Trying og:image scrape from source...");
  const scraped = await scrapeOgImage(sourceUrl);
  if (scraped) {
    console.log(`[Thumbnail] Found og:image from ${scraped.siteName}`);
    return { url: scraped.imageUrl, source: scraped.siteName };
  }

  // Step 2: Generate with AI via OpenRouter
  console.log("[Thumbnail] No og:image found, generating with AI...");
  const aiUrl = await generateAIImage(title);
  if (aiUrl) {
    console.log("[Thumbnail] AI image generated and stored in Supabase Storage");
    return { url: aiUrl, source: null };
  }

  // All methods failed — UI handles null thumbnails with gradient placeholder
  console.warn("[Thumbnail] All methods failed, no thumbnail available");
  return { url: "", source: null };
}

// --------------- OG:IMAGE SCRAPER ---------------

async function scrapeOgImage(
  sourceUrl: string
): Promise<{ imageUrl: string; siteName: string } | null> {
  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AiFeedBot/1.0; +https://aifeed.pl)",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract og:image — handle both attribute orders
    const ogImage =
      html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      )?.[1] ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
      )?.[1];

    if (!ogImage) return null;

    // Resolve relative URLs
    let imageUrl = ogImage;
    if (imageUrl.startsWith("/")) {
      const base = new URL(sourceUrl);
      imageUrl = `${base.protocol}//${base.host}${imageUrl}`;
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return null;
    }

    // Validate image is accessible and not a tracking pixel
    try {
      const head = await fetch(imageUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
        redirect: "follow",
      });
      if (!head.ok) return null;

      const contentType = head.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) return null;

      const size = parseInt(head.headers.get("content-length") || "0");
      if (size > 0 && size < 5_000) return null; // skip tiny tracking pixels
    } catch {
      // Some CDNs block HEAD — still try using the URL
    }

    // Extract site name for attribution
    const siteName =
      html.match(
        /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
      )?.[1] ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i
      )?.[1] ||
      new URL(sourceUrl).hostname.replace("www.", "");

    return { imageUrl, siteName };
  } catch (error) {
    console.warn("[Thumbnail] Scrape failed:", error);
    return null;
  }
}

// --------------- AI IMAGE GENERATION ---------------

async function generateAIImage(title: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[Thumbnail] OPENROUTER_API_KEY not set, skipping AI generation");
    return null;
  }

  const prompt = `Professional editorial illustration for an AI technology news article titled: "${title}". Style: modern digital art, clean composition, abstract tech visualization with neural network patterns or futuristic elements. Premium tech magazine aesthetic. No text, no words, no logos, no watermarks.`;

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "AiFeed",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image"],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[Thumbnail] AI generation error ${res.status}: ${errorBody}`);
      return null;
    }

    const data = await res.json();

    // Log cost info
    if (data.usage) {
      console.log(`[Thumbnail Cost] ${JSON.stringify(data.usage)}`);
    }

    // Extract base64 image — try OpenRouter images array first
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const dataUrl = images[0]?.image_url?.url;
      if (dataUrl) {
        const parsed = parseDataUrl(dataUrl);
        if (parsed) return await uploadToStorage(parsed.buffer, parsed.format);
      }
    }

    // Fallback: some models embed data URL in message content
    const content = data.choices?.[0]?.message?.content || "";
    const dataUrlMatch = content.match(
      /data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/
    );
    if (dataUrlMatch) {
      const buffer = Buffer.from(dataUrlMatch[2], "base64");
      return await uploadToStorage(buffer, dataUrlMatch[1]);
    }

    console.warn("[Thumbnail] No image data in AI response");
    return null;
  } catch (error) {
    console.error("[Thumbnail] AI generation failed:", error);
    return null;
  }
}

function parseDataUrl(
  dataUrl: string
): { buffer: Buffer; format: string } | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), format: match[1] };
}

// --------------- SUPABASE STORAGE ---------------

async function uploadToStorage(
  imageBuffer: Buffer,
  format: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    // Ensure bucket exists (idempotent — ignores "already exists")
    await supabase.storage
      .createBucket("thumbnails", {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      })
      .catch(() => {});

    const ext = format === "jpeg" ? "jpg" : format;
    const fileName = `ai-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("thumbnails")
      .upload(fileName, imageBuffer, {
        contentType: `image/${format}`,
        upsert: true,
      });

    if (error) {
      console.error("[Thumbnail] Supabase Storage upload error:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("thumbnails").getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("[Thumbnail] Upload to Storage failed:", error);
    return null;
  }
}
