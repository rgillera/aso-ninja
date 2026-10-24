import PortalEyebrow from "./PortalEyebrow";
import PortalGridBackdrop from "./PortalGridBackdrop";

// Closing CTA card: a small echo of the hero (line grid, one glow, centered
// copy). Shared by the homepage audit block and the service pages.
export default function PortalCtaCard({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-gray-950/10 sm:px-12 sm:py-20">
      <PortalGridBackdrop glowClassName="top-0 h-56 w-[36rem] bg-indigo-400/15" />
      <PortalEyebrow>{eyebrow}</PortalEyebrow>
      <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
        {title}
        {highlight && (
          <>
            {" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">{highlight}</span>
          </>
        )}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-7 text-gray-600">{description}</p>
      {children}
    </div>
  );
}
