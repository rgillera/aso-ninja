import { ImageResponse } from "next/og";
import { getBlogPost } from "@/features/blog/posts";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#111827",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: 2 }}>
          {post?.category ?? "Blog"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 56,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
          }}
        >
          {post?.title ?? "AppASO Blog"}
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 32, color: "#9ca3af" }}>
          App<span style={{ color: "#818cf8" }}>ASO</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
