import { ImageResponse } from "next/og";

// Manifest icon — referenced from app/manifest.ts. Same brand mark as
// app/icon.tsx but at 192×192 for Android home screens.
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
          fontSize: 118,
          letterSpacing: -6,
        }}
      >
        a.
      </div>
    ),
    { width: 192, height: 192 }
  );
}
