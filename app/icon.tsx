import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
          <div style={{ width: 5, height: 9, background: "#6366f1", borderRadius: 1 }} />
          <div style={{ width: 5, height: 15, background: "#818cf8", borderRadius: 1 }} />
          <div style={{ width: 5, height: 21, background: "#a5b4fc", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
