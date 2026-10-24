import { CheckIcon } from "@heroicons/react/20/solid";
import PortalButton from "./PortalButton";
import PortalCtaCard from "./PortalCtaCard";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

const PERKS = ["Free", "15 minutes", "Live listing review"];

export default function PortalGrowthAudit() {
  return (
    <section className="bg-white pb-24 sm:pb-32">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <PortalCtaCard
          eyebrow="Free App Audit"
          title="Want an expert to"
          highlight="review your app?"
          description={
            <>
              Hop on a quick call with an ASO specialist. We&apos;ll review your listing live
              and point out the biggest opportunities holding back your downloads.
            </>
          }
        >
          <PortalButton href={calendlyUrl ?? "mailto:hello@appaso.io"} external={!!calendlyUrl} className="mt-8">
            Book a free audit
          </PortalButton>

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
        </PortalCtaCard>
      </div>
    </section>
  );
}
