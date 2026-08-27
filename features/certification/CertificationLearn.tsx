"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ExclamationTriangleIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import {
  CERTIFICATION_MODULES,
  CERTIFICATION_LEVEL_ORDER,
  LEVEL_LABEL,
  DEFAULT_MODULE_ID,
  findModule,
  modulesByLevel,
} from "./content";

const PROGRESS_KEY = "aso_certification_learn_progress";
const LAST_MODULE_KEY = "aso_certification_learn_last";

function loadProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(ids: Set<string>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable (private mode, blocked storage, etc.) — progress just won't persist
  }
}

export default function CertificationLearn() {
  const [moduleId, setModuleId] = useState(DEFAULT_MODULE_ID);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [showAnswer, setShowAnswer] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Resume where the learner left off, and load prior progress. Runs once on mount.
  useEffect(() => {
    const savedProgress = loadProgress();
    setVisited(savedProgress);
    try {
      const lastId = localStorage.getItem(LAST_MODULE_KEY);
      if (lastId && findModule(lastId)) setModuleId(lastId);
    } catch {
      // ignore, default module stands
    }
    setHydrated(true);
  }, []);

  // Mark the current module read and remember it as "last viewed" whenever it changes.
  useEffect(() => {
    if (!hydrated) return;
    setShowAnswer(false);
    setVisited((prev) => {
      if (prev.has(moduleId)) return prev;
      const next = new Set(prev).add(moduleId);
      saveProgress(next);
      return next;
    });
    try {
      localStorage.setItem(LAST_MODULE_KEY, moduleId);
    } catch {
      // ignore
    }
  }, [moduleId, hydrated]);

  const current = findModule(moduleId) ?? findModule(DEFAULT_MODULE_ID)!;
  const currentIndex = CERTIFICATION_MODULES.findIndex((m) => m.id === current.id);
  const next = CERTIFICATION_MODULES[currentIndex + 1];
  const isLast = !next;
  const completedCount = visited.size;
  const totalCount = CERTIFICATION_MODULES.length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white text-black">
      <div className="px-8 pt-6 pb-4 border-b border-black/10 flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/certification" className="text-xs font-medium text-black/50 hover:text-black">
            ← ASO Certification
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Learn ASO, Basic to Advanced</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-black/50">
              {completedCount} of {totalCount} lessons read
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/certification/exam"
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Take the exam
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Module list */}
        <nav className="w-64 shrink-0 overflow-y-auto border-r border-black/10 px-6 py-6 space-y-5">
          {CERTIFICATION_LEVEL_ORDER.map((level) => (
            <div key={level}>
              <p className="text-sm font-bold">{LEVEL_LABEL[level]}</p>
              <ul className="mt-1.5 space-y-1">
                {modulesByLevel(level).map((m) => (
                  <li key={m.id}>
                    <a
                      href={`#${m.id}`}
                      onClick={(e) => { e.preventDefault(); setModuleId(m.id); }}
                      className={`flex items-center gap-1.5 text-[13px] font-normal ${
                        m.id === moduleId ? "underline" : "text-black/70 hover:underline"
                      }`}
                    >
                      {visited.has(m.id) ? (
                        <CheckCircleIcon className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <span className="size-3.5 shrink-0 rounded-full border border-black/20" />
                      )}
                      <span className="truncate">{m.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Article */}
        <div className="flex-1 min-w-0 overflow-y-auto px-10 py-8">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/40">{LEVEL_LABEL[current.level]}</p>
            <p className="text-xs text-black/30">
              Lesson {currentIndex + 1} of {totalCount}
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold">{current.title}</h2>

          <p className="mt-3 text-sm leading-relaxed">{current.summary}</p>

          <h3 className="mt-6 text-sm font-semibold">Key points</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            {current.keyPoints.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg border border-black/10 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <LightBulbIcon className="size-4 text-black/50" />
              <p className="text-sm font-semibold">In practice</p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-black/80">{current.example}</p>
          </div>

          <h3 className="mt-6 flex items-center gap-1.5 text-sm font-semibold">
            <ExclamationTriangleIcon className="size-4 text-amber-600" />
            Common mistakes
          </h3>
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            {current.commonMistakes.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg bg-indigo-50 px-4 py-3">
            <p className="text-sm font-semibold text-indigo-900">Takeaway</p>
            <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">{current.takeaway}</p>
          </div>

          <div className="mt-6 rounded-lg border border-black/10 px-4 py-3">
            <p className="text-sm font-semibold">Quick check</p>
            <p className="mt-1.5 text-sm leading-relaxed text-black/80">{current.checkYourself.question}</p>
            {showAnswer ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-emerald-700">
                <CheckIcon className="mt-0.5 size-4 shrink-0" />
                {current.checkYourself.answer}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Reveal answer
              </button>
            )}
          </div>

          <div className="mt-8 border-t border-black/10 pt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setModuleId(CERTIFICATION_MODULES[currentIndex - 1].id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-black/70 hover:text-black disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeftIcon className="size-4" /> Previous
            </button>

            {isLast ? (
              <Link
                href="/dashboard/certification/exam"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                You&apos;ve covered everything, take the exam
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setModuleId(next.id)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-black/70 hover:text-black"
              >
                Next <ArrowRightIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
