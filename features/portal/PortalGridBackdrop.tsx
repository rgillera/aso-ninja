// Faint line grid that fades out from the top, plus one soft glow. Same
// treatment as the hero; the parent needs `relative isolate`.
export default function PortalGridBackdrop({ glowClassName = "top-32 h-72 w-[44rem]" }: { glowClassName?: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_45%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className={`absolute left-1/2 -z-10 max-w-full -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl ${glowClassName}`}
      />
    </>
  );
}
