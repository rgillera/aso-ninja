"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClockIcon, LockClosedIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { CERTIFICATION_QUESTIONS, CERTIFICATION_PASS_THRESHOLD, MAX_EXAM_QUESTIONS, type CertificationQuestion } from "./questions";
import { LEVEL_LABEL, CERTIFICATION_LEVEL_ORDER } from "./content";
import { buildExamAttempt } from "./examEngine";
import { recordCertificationAction, type CertificationRecord } from "./actions";
import { CertificateDownload } from "./CertificateDownload";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

type Stage = "intro" | "exam" | "results";

const PASS_PERCENT = Math.round(CERTIFICATION_PASS_THRESHOLD * 100);
const EXAM_DURATION_SECONDS = 45 * 60; // 45 minutes for the whole attempt, not per question

function formatClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

type Props = {
  /** Best-guess name for the certificate, from the account's profile or email. Editable before download. */
  holderName?: string;
};

export default function CertificationExam({ holderName = "" }: Props) {
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "basic");

  const [stage, setStage] = useState<Stage>("intro");
  const [examSet, setExamSet] = useState<CertificationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const [certRecord, setCertRecord] = useState<CertificationRecord | null>(null);

  // Single countdown for the whole attempt. Auto-submits at zero.
  useEffect(() => {
    if (stage !== "exam") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setStage("results");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  const total = examSet.length;
  const question = examSet[index];
  const selected = question ? answers[question.id] : undefined;

  const score = useMemo(
    () => examSet.reduce((n, q) => (answers[q.id] === q.correctIndex ? n + 1 : n), 0),
    [answers, examSet]
  );

  const byLevel = useMemo(
    () =>
      CERTIFICATION_LEVEL_ORDER.map((level) => {
        const qs = examSet.filter((q) => q.level === level);
        const correct = qs.filter((q) => answers[q.id] === q.correctIndex).length;
        return { level, correct, total: qs.length };
      }),
    [answers, examSet]
  );

  function selectAnswer(optionIndex: number) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  }

  function goNext() {
    if (index + 1 < total) setIndex(index + 1);
    else setStage("results");
  }

  function startExam() {
    setExamSet(buildExamAttempt(CERTIFICATION_QUESTIONS, MAX_EXAM_QUESTIONS));
    setAnswers({});
    setIndex(0);
    setSecondsLeft(EXAM_DURATION_SECONDS);
    setCertRecord(null);
    setStage("exam");
  }

  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = total > 0 && score / total >= CERTIFICATION_PASS_THRESHOLD;
  const timeRunningLow = secondsLeft <= 60;

  // Persist a pass so the certification page can show "you're certified"
  // and the PDF can be redownloaded later without retaking the exam.
  useEffect(() => {
    if (stage !== "results" || !passed || certRecord) return;
    let cancelled = false;
    recordCertificationAction({ score, total }).then((result) => {
      if (cancelled) return;
      if ("record" in result) setCertRecord(result.record);
    });
    return () => {
      cancelled = true;
    };
  }, [stage, passed, certRecord, score, total]);

  if (stage === "intro") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-14 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/15">
            <TrophyIcon className="size-7 text-indigo-400" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-white">ASO Certification Exam</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
            {MAX_EXAM_QUESTIONS} questions, basic to advanced, drawn at random so a retake serves a different set. Score{" "}
            {PASS_PERCENT}% or higher to pass. You&apos;ll have {EXAM_DURATION_SECONDS / 60} minutes for the whole exam once you start.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/certification/learn"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-300 ring-1 ring-white/10 hover:bg-white/5"
            >
              Review the lessons first
            </Link>
            {isLocked ? (
              <Link
                href="/dashboard/subscription"
                title="Requires the Basic plan or above"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/15"
              >
                <LockClosedIcon className="size-4" />
                Start exam
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-500">Basic</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={startExam}
                className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Start exam
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "results") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-14 text-center">
          <div
            className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
              passed ? "bg-emerald-500/15" : "bg-amber-500/15"
            }`}
          >
            <TrophyIcon className={`size-7 ${passed ? "text-emerald-400" : "text-amber-400"}`} />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-white">
            {passed ? "You're certified" : "Not quite, try again"}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            You scored {score} / {total} ({percent}%).{" "}
            {passed ? `That clears the ${PASS_PERCENT}% pass mark.` : `You need ${PASS_PERCENT}% to pass.`}
            {secondsLeft === 0 && " Time ran out, unanswered questions counted as incorrect."}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-left">
            {byLevel.map(({ level, correct, total: levelTotal }) => (
              <div key={level} className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{LEVEL_LABEL[level]}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {correct}/{levelTotal}
                </p>
              </div>
            ))}
          </div>

          {passed && (
            <div className="mt-8 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 text-left">
              <p className="text-sm font-semibold text-white">Download your certificate</p>
              <p className="mt-1 text-xs text-gray-400">
                {certRecord
                  ? "Confirm the name that should appear on the PDF. Saved to your account, you can redownload anytime from the certification page."
                  : "Confirm the name that should appear on the PDF. Saving to your account..."}
              </p>
              <div className="mt-3">
                <CertificateDownload holderName={holderName} certificateId={certRecord?.certificateId} issuedAt={certRecord?.issuedAt} />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/certification/learn"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-300 ring-1 ring-white/10 hover:bg-white/5"
            >
              Review the lessons
            </Link>
            <button
              type="button"
              onClick={startExam}
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Retake exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500">
          <span>
            Question {index + 1} of {total}
          </span>
          <span
            className={`inline-flex items-center gap-1 ${timeRunningLow ? "text-amber-400" : "text-gray-500"}`}
            title="Time left for the whole exam"
          >
            <ClockIcon className="size-3.5" />
            {formatClock(secondsLeft)}
          </span>
          <span className="uppercase tracking-wide">{LEVEL_LABEL[question.level]}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(index / total) * 100}%` }} />
        </div>

        <h2 className="mt-6 text-base font-semibold leading-relaxed text-white">{question.question}</h2>

        <div className="mt-5 space-y-2.5">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectAnswer(i)}
              className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left text-sm ring-1 transition-colors ${
                selected === i
                  ? "bg-indigo-500/15 text-white ring-indigo-500/50"
                  : "bg-white/5 text-gray-300 ring-white/10 hover:bg-white/[0.07]"
              }`}
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  selected === i ? "bg-indigo-500 ring-indigo-500" : "ring-white/20"
                }`}
              >
                {selected === i && <span className="size-1.5 rounded-full bg-white" />}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((v) => Math.max(0, v - 1))}
            className="text-sm font-medium text-gray-400 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            disabled={selected === undefined}
            onClick={goNext}
            className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:pointer-events-none disabled:opacity-40"
          >
            {index + 1 === total ? "Submit exam" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
