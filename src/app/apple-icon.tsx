import { ImageResponse } from "next/og";

// iOS touch icon — must be opaque (no transparency), iOS rounds corners
// itself. Used when a user adds the site to their home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #4c2dd9 0%, #7c4ddb 100%)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 110,
          letterSpacing: -6,
        }}
      >
        a.
      </div>
    ),
    { ...size }
  );
}
