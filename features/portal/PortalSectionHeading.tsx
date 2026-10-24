import PortalEyebrow from "./PortalEyebrow";

// Centered eyebrow + heading + intro used by every portal section. The
// optional `highlight` is appended to the title in the brand gradient.
export default function PortalSectionHeading({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <PortalEyebrow>{eyebrow}</PortalEyebrow>
      <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
        {title}
        {highlight && (
          <>
            {" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">{highlight}</span>
          </>
        )}
      </h2>
      {description && <p className="mt-6 text-balance text-lg text-gray-600">{description}</p>}
    </div>
  );
}
