import { ArrowRightIcon, CheckIcon } from "@heroicons/react/20/solid";
import PortalEyebrow from "./PortalEyebrow";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

const PERKS = ["Free", "15 minutes", "Live listing review"];

export default function PortalGrowthAudit() {
  return (
    <section className="bg-white pb-24 sm:pb-32">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Closing CTA, styled as a small echo of the hero: faint line grid
            fading from the top, one soft glow, centered copy. */}
        <div className="relative isolate overflow-hidden rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-gray-950/10 sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 -z-10 h-56 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl"
          />

          <PortalEyebrow>Free App Audit</PortalEyebrow>
          <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
            Want an expert to{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">review your app?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-7 text-gray-600">
            Hop on a quick call with an ASO specialist. We&apos;ll review your listing live
            and point out the biggest opportunities holding back your downloads.
          </p>

          <a
            href={calendlyUrl ?? "mailto:hello@appaso.io"}
            target={calendlyUrl ? "_blank" : undefined}
            rel={calendlyUrl ? "noopener noreferrer" : undefined}
            className="group mt-8 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Book a free audit
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </a>

          <ul className="mt-6 flex flex-col items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-700 sm:flex-row">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <CheckIcon className="size-4 text-indigo-600" aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-8 max-w-md text-sm leading-6 text-gray-500">
            Tip: add your App Store or Play link when booking so we can review it before the call.
          </p>
        </div>
      </div>
    </section>
  );
}
