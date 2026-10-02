import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "white" }}>
          App<span style={{ color: "#818cf8" }}>ASO</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, fontWeight: 600, color: "white" }}>
          Pro-level ASO data, without the $299 price tag.
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: "#9ca3af" }}>
          Start free. Upgrade from $29/mo.
        </div>
      </div>
    ),
    { ...size }
  );
}
