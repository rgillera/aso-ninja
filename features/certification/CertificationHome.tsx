import Link from "next/link";
import { BookOpenIcon, CheckBadgeIcon, PencilSquareIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { CERTIFICATION_MODULES, CERTIFICATION_LEVEL_ORDER, LEVEL_LABEL, modulesByLevel } from "./content";
import { CERTIFICATION_PASS_THRESHOLD, MAX_EXAM_QUESTIONS } from "./questions";
import type { CertificationRecord } from "./actions";
import { CertificateDownload } from "./CertificateDownload";

type Props = {
  holderName?: string;
  certification?: CertificationRecord | null;
};

export default function CertificationHome({ holderName = "", certification }: Props) {
  const passPercent = Math.round(CERTIFICATION_PASS_THRESHOLD * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
            <TrophyIcon className="size-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">ASO Certification</h1>
            <p className="text-sm text-gray-400">Learn app store optimization from the ground up, then prove it on the exam.</p>
          </div>
        </div>

        {certification && (
          <div className="mt-6 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 p-5">
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="size-5 shrink-0 text-emerald-400" />
              <p className="text-sm font-semibold text-white">
                You&apos;re certified, issued{" "}
                {new Date(certification.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Lost your PDF? Redownload it here anytime.</p>
            <div className="mt-3 max-w-md">
              <CertificateDownload
                holderName={holderName}
                certificateId={certification.certificateId}
                issuedAt={certification.issuedAt}
              />
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/certification/learn"
            className="group rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 transition-colors hover:bg-white/[0.07] hover:ring-indigo-500/40"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/15">
              <BookOpenIcon className="size-5 text-indigo-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">Learn ASO, Basic to Advanced</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
              {CERTIFICATION_MODULES.length} short lessons across {CERTIFICATION_LEVEL_ORDER.length} levels, from what ASO is up to building an ongoing strategy.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              Start learning →
            </span>
          </Link>

          <Link
            href="/dashboard/certification/exam"
            className="group rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 transition-colors hover:bg-white/[0.07] hover:ring-indigo-500/40"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/15">
              <PencilSquareIcon className="size-5 text-indigo-400" />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">Take the Exam</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
              {MAX_EXAM_QUESTIONS} questions, timed, drawn at random so every retake is different. Score {passPercent}% or higher to earn your certification.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              Start exam →
            </span>
          </Link>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">What&apos;s covered</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            {CERTIFICATION_LEVEL_ORDER.map((level) => (
              <div key={level}>
                <p className="text-sm font-semibold text-white">{LEVEL_LABEL[level]}</p>
                <ul className="mt-1.5 space-y-1">
                  {modulesByLevel(level).map((m) => (
                    <li key={m.id} className="text-sm text-gray-400">{m.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
