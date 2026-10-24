import { CERTIFICATION_MODULES } from "@/features/certification/content";
import { CERTIFICATION_QUESTIONS, MAX_EXAM_QUESTIONS, CERTIFICATION_PASS_THRESHOLD } from "@/features/certification/questions";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import PortalEyebrow from "./PortalEyebrow";

// Numbers come from the certification feature itself so this section can't
// drift from what the exam actually is.
const facts = [
  {
    name: `${CERTIFICATION_MODULES.length} overview lessons`,
    description: "A quick tour of the key topics: ranking factors, keyword research, metadata, visuals, localization, A/B testing and more.",
    label: "Learn",
  },
  {
    name: `${MAX_EXAM_QUESTIONS}-question exam`,
    description: `Timed and drawn at random from a ${CERTIFICATION_QUESTIONS.length}-question bank, from fundamentals to advanced strategy. Score ${Math.round(CERTIFICATION_PASS_THRESHOLD * 100)}% or more to pass. Included with Pro.`,
    label: "Test",
  },
  {
    name: "Your certificate",
    description: "Download a certificate with your name and a unique certificate ID, ready to share.",
    label: "Share",
  },
];

export default function PortalCertification({ isAuthenticated }: { isAuthenticated: boolean }) {
  const href = isAuthenticated ? "/dashboard/certification/learn" : "/signup?next=/dashboard/certification/learn";

  return (
    <section id="certification" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <PortalEyebrow>ASO certification</PortalEyebrow>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              Learn ASO.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Prove it.</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Start with a free overview course. On Pro, take the exam that tests real ASO knowledge in depth, and pass it to get a
              certificate you can add to your LinkedIn or portfolio.
            </p>

            {/* Lessons, exam and certificate are done in that order, so they
                use the same numbered rail as the How it works section. */}
            <ol className="mt-10">
              {facts.map((f, i) => (
                <li key={f.name} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < facts.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-12 bottom-2 w-px -translate-x-1/2 bg-gradient-to-b from-indigo-300 via-violet-200 to-transparent"
                    />
                  )}
                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm ring-4 ring-white">
                    <span className="text-sm font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="pt-0.5">
                    <p className="font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">
                      {String(i + 1).padStart(2, "0")} / {f.label}
                    </p>
                    <h3 className="mt-1.5 text-base font-semibold text-gray-950">{f.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{f.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10">
              <a
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {isAuthenticated ? "Start the course" : "Start the free course"}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Mirrors the real PDF (features/certification/certificate.ts):
              dark background, double border, AppASO mark, name, ID and date.
              Hidden on phones, where its small print can't be read anyway. */}
          <div className="hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-6 sm:block lg:p-10">
            <div
              role="img"
              aria-label="Example AppASO ASO Certification certificate"
              className="aspect-[297/210] rounded-xl bg-[#0e0e10] p-3 shadow-clay-lg sm:p-4"
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
