import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/data";

// Per-article social card. Generated on first request, then cached by Next.
// Note: page.tsx must NOT set `metadata.openGraph.images` explicitly —
// otherwise it overrides the file-convention image. Article thumbnail is
// still kept in DB for use in cards/lists; this convention is purely for the
// social share image rendered at /artykul/[slug]/opengraph-image.
export const alt = "AiFeed — artykuł";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArticleOpenGraph({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  const title = article?.title ?? "AiFeed — artykuł";
  const category = article?.category?.name ?? "Wiadomości AI";
  const readingTime = article?.reading_time;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1a1330 0%, #2d1b5e 50%, #4c2dd9 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Top: brand + category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -0.6,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.22)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                letterSpacing: -1.6,
              }}
            >
              a.
            </div>
            aifeed.pl
          </div>
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {category}
          </div>
        </div>

        {/* Title — clamped, with smaller font as length grows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: title.length > 80 ? 56 : title.length > 50 ? 64 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: "100%",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {readingTime && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 500,
              }}
            >
              <span>{readingTime} min czytania</span>
            </div>
          )}
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #f472b6 0%, #8b5cf6 50%, #38bdf8 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
