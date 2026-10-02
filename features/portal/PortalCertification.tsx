import { AcademicCapIcon, ClipboardDocumentCheckIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { CERTIFICATION_MODULES } from "@/features/certification/content";
import { CERTIFICATION_QUESTIONS, MAX_EXAM_QUESTIONS, CERTIFICATION_PASS_THRESHOLD } from "@/features/certification/questions";
import PortalEyebrow from "./PortalEyebrow";

// Numbers come from the certification feature itself so this section can't
// drift from what the exam actually is.
const facts = [
  {
    name: `${CERTIFICATION_MODULES.length} overview lessons`,
    description: "A quick tour of the key topics: ranking factors, keyword research, metadata, visuals, localization, A/B testing and more.",
    icon: AcademicCapIcon,
  },
  {
    name: `${MAX_EXAM_QUESTIONS}-question exam`,
    description: `Timed and drawn at random from a ${CERTIFICATION_QUESTIONS.length}-question bank, from fundamentals to advanced strategy. Score ${Math.round(CERTIFICATION_PASS_THRESHOLD * 100)}% or more to pass.`,
    icon: ClipboardDocumentCheckIcon,
  },
  {
    name: "Your certificate",
    description: "Download a certificate with your name and a unique certificate ID, ready to share.",
    icon: TrophyIcon,
  },
];

export default function PortalCertification({ isAuthenticated }: { isAuthenticated: boolean }) {
  const href = isAuthenticated ? "/dashboard/certification" : "/signup?next=/dashboard/certification";

  return (
    <section id="certification" className="bg-[#f5f6f8] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <PortalEyebrow>Free ASO certification</PortalEyebrow>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Learn ASO. <span className="text-indigo-600">Prove it.</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Start with a free overview course, then take an exam that tests real ASO knowledge in depth. Pass it and get a
              certificate you can add to your LinkedIn or portfolio.
            </p>

            <dl className="mt-10 space-y-6">
              {facts.map((f) => (
                <div key={f.name} className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                    <f.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-base font-semibold text-gray-900">{f.name}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-gray-600">{f.description}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <a
                href={href}
                className="inline-flex rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {isAuthenticated ? "Start the course" : "Get certified free"}
              </a>
            </div>
          </div>

          {/* Mirrors the real PDF (features/certification/certificate.ts):
              dark background, double border, AppASO mark, name, ID and date. */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-2xl"
            />
            <div
              role="img"
              aria-label="Example AppASO ASO Certification certificate"
              className="aspect-[297/210] rotate-1 rounded-xl bg-[#111318] p-3 shadow-clay-lg sm:p-4"
            >
              <div className="flex h-full flex-col items-center justify-between rounded-md border-2 border-indigo-500 p-1.5">
                <div className="flex h-full w-full flex-col items-center justify-between rounded-sm border border-white/60 px-4 py-5 text-center sm:px-8 sm:py-7">
                  <div className="flex flex-col items-center">
                    <div className="flex items-end gap-2">
                      <span className="flex items-end gap-0.5">
                        <span className="h-2 w-1 bg-indigo-300" />
                        <span className="h-3 w-1 bg-indigo-400" />
                        <span className="h-4 w-1 bg-indigo-500" />
                      </span>
                      <span className="text-sm font-bold leading-none text-white sm:text-base">
                        App<span className="text-indigo-400">ASO</span>
                      </span>
                    </div>
                    <p className="mt-2 text-[8px] tracking-[0.35em] text-gray-400 sm:text-[10px]">ASO CERTIFICATION</p>
                  </div>

                  <div className="w-full">
                    <p className="font-serif text-2xl font-bold italic text-white sm:text-4xl">Your Name</p>
                    <div className="mx-auto mt-2 h-px w-2/3 bg-indigo-400" />
                    <p className="mx-auto mt-3 max-w-sm text-[9px] leading-relaxed text-gray-300 sm:text-xs">
                      Is hereby awarded this certificate of achievement for the successful completion of the ASO
                      Certification exam.
                    </p>
                  </div>

                  <div className="flex w-full items-end justify-between text-left text-[7px] sm:text-[9px]">
                    <div>
                      <p className="font-bold tracking-wide text-gray-400">CERTIFICATE ID:</p>
                      <p className="mt-0.5 font-mono text-gray-300">a1b2c3d4e5f6a7b8c9d0e1f2</p>
                    </div>
                    <p className="text-[9px] font-bold text-white sm:text-xs">
                      App<span className="text-indigo-400">ASO.io</span>
                    </p>
                    <div className="text-right">
                      <p className="font-bold tracking-wide text-gray-400">DATE:</p>
                      <p className="mt-0.5 text-gray-300">Your pass date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
