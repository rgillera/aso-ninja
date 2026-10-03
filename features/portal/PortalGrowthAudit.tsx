import PortalEyebrow from "./PortalEyebrow";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

export default function PortalGrowthAudit() {
  return (
    <section className="bg-[#eef0f5] py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 shadow-clay-lg">
          <div className="px-6 py-12 sm:px-10 sm:py-16">
            <PortalEyebrow>App Growth Audit</PortalEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Want an expert to review your app?
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-300">
              Hop on a quick call with an ASO specialist. We&apos;ll review your listing live
              and point out the biggest opportunities holding back your downloads.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <a
                href={calendlyUrl ?? "/growth-audit"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-clay-sm transition-colors hover:bg-indigo-50"
              >
                Book audit now
              </a>
              <span className="text-sm text-gray-400">It&apos;s free &middot; 15 minutes</span>
              <p className="mt-4 rounded-lg bg-white/5 px-4 py-3 text-sm leading-6 text-gray-300 ring-1 ring-white/10">
                <span className="font-semibold text-white">Tip:</span>{" "}
                When booking, add your app name or App Store link in the &ldquo;Please share anything that will help prepare
                for our meeting&rdquo; field so our specialist can review it beforehand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
