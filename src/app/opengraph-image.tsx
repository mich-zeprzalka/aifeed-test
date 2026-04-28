import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Default brand card — używana gdy strona nie ma własnego `image` w metadata
// (home, kategoria, tag, statyczne, artykuły bez `thumbnail_url`). Per-artykuł
// social-share używa `article.thumbnail_url` z DB (zob. `articleMetadata` w
// `lib/seo.ts`).
//
// Paleta dopasowana do `globals.css :root` (light theme — większość czytników
// social ma białe tło, więc light card lepiej blenduje):
//   --background:        oklch(0.99 0.001 260)  ≈ #fafafa
//   --foreground:        oklch(0.12 0.02 260)   ≈ #1c1d2e
//   --muted-foreground:  oklch(0.46 0.015 260)  ≈ #6b7080
//   --primary:           oklch(0.50 0.24 270)   ≈ #5b3df7
// Satori (silnik next/og) NIE wspiera oklch — wartości muszą być hex/rgb.

const COLOR_BACKGROUND = "#fafafa";
const COLOR_FOREGROUND = "#1c1d2e";
const COLOR_MUTED = "#6b7080";
const COLOR_PRIMARY = "#5b3df7";

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
          background: COLOR_BACKGROUND,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
          color: COLOR_FOREGROUND,
          position: "relative",
        }}
      >
        {/* Tag bar — uppercase mono-style, wskazuje typ contentu */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLOR_PRIMARY,
          }}
        >
          Wiadomości AI · Badania · Raporty
        </div>

        {/* Headline + description — główna treść karty */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -3,
              maxWidth: "92%",
              color: COLOR_FOREGROUND,
            }}
          >
            Codzienne wiadomości o sztucznej inteligencji
          </div>
          <div
            style={{
              fontSize: 28,
              color: COLOR_MUTED,
              lineHeight: 1.4,
              maxWidth: "78%",
            }}
          >
            {siteConfig.description}
          </div>
        </div>

        {/* Wordmark — same pattern jak w `components/layout/header.tsx`:
            `aifeed` w foreground + kropka w primary. Brak graficznego logo. */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -1,
            color: COLOR_FOREGROUND,
          }}
        >
          aifeed<span style={{ color: COLOR_PRIMARY }}>.</span>
        </div>

        {/* Bottom accent bar — solid primary, jak border-bottom headera */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: COLOR_PRIMARY,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
