import { ImageResponse } from "next/og";

// Auto-bound to <link rel="icon"> in metadata. Replaces the missing
// /public/icon.png — generated dynamically with the brand mark.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "linear-gradient(135deg, #5b3df7 0%, #8b5cf6 100%)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        a.
      </div>
    ),
    { ...size }
  );
}
