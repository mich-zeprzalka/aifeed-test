import { ImageResponse } from "next/og";

// Manifest icon — used by Android for splash screen and full-resolution
// home screen rendering. Same artwork as 192 to keep brand consistency.
export async function GET() {
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
          fontSize: 312,
          letterSpacing: -16,
        }}
      >
        a.
      </div>
    ),
    { width: 512, height: 512 }
  );
}
