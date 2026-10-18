import PortalEyebrow from "./PortalEyebrow";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

export default function PortalGrowthAudit() {
  return (
    <section className="bg-[#eef0f5] py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-clay ring-1 ring-black/5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-50 blur-3xl"
          />
          <div className="relative flex flex-col gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <PortalEyebrow>Free App Audit</PortalEyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Want an expert to review your app?
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                Hop on a quick call with an ASO specialist. We&apos;ll review your listing live
                and point out the biggest opportunities holding back your downloads.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-center">
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn transition-colors hover:bg-indigo-500"
              >
                Book a free audit
              </a>
              <span className="text-sm text-gray-500">Free &middot; 15 minutes</span>
            </div>
          </div>
          <p className="relative border-t border-black/[0.06] bg-gray-50/80 px-6 py-4 text-sm leading-6 text-gray-500 sm:px-10">
            <span className="font-semibold text-gray-700">Tip:</span> add your App Store or Play link when booking so we
            can review it before the call.
          </p>
        </div>
      </div>
    </section>
  );
}
