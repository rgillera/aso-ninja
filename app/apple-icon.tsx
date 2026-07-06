import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ width: 28, height: 52, background: "#6366f1", borderRadius: 6 }} />
          <div style={{ width: 28, height: 88, background: "#818cf8", borderRadius: 6 }} />
          <div style={{ width: 28, height: 124, background: "#a5b4fc", borderRadius: 6 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
