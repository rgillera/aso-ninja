import Link from "next/link";

// Shared frame for the standalone auth screens: the same fading line grid and
// soft glow as the homepage hero, plus the logo pinned top-left as the way
// back to the site. Rendered as the first child of each screen's centered
// `relative isolate` wrapper, so the screens keep their own layout.
export default function AuthBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 -z-10 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl"
      />
      <Link href="/" className="absolute left-4 top-5 flex items-center gap-2 sm:left-8 sm:top-6">
        <span className="flex items-end gap-0.5 rounded-lg bg-gray-950 p-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
          <span className="h-4 w-1 rounded-sm bg-indigo-400" />
          <span className="h-5 w-1 rounded-sm bg-indigo-300" />
        </span>
        <span className="text-lg font-bold tracking-tight text-gray-950">
          App<span className="text-indigo-600">ASO</span>
        </span>
      </Link>
    </>
  );
}
