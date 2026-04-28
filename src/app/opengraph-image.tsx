import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Default social-share card. Replaces the missing /public/og-image.png file.
// Per-article variants live in app/artykul/[slug]/opengraph-image.tsx and
// override this for individual articles.
export const alt = "AiFeed — codzienne wiadomości o sztucznej inteligencji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1a1330 0%, #2d1b5e 50%, #4c2dd9 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.25)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            a.
          </div>
          aifeed.pl
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2.5,
              maxWidth: "90%",
            }}
          >
            Codzienne wiadomości o sztucznej inteligencji
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.4,
              maxWidth: "75%",
            }}
          >
            {siteConfig.description}
          </div>
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
