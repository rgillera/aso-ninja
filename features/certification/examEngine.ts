import { CERTIFICATION_LEVEL_ORDER } from "./content";
import type { CertificationQuestion } from "./questions";

// Builds a fresh, randomized exam attempt from the question pool: a random
// subset (proportional across levels, ordered basic -> advanced) with each
// question's own options shuffled. Called once per "Start exam" / "Retake",
// so a retake reliably serves a different set of questions in a different
// order, not just the same 50 every time.

function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleOptions(question: CertificationQuestion): CertificationQuestion {
  const order = shuffle(question.options.map((_, i) => i));
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correctIndex: order.indexOf(question.correctIndex),
  };
}

/** Largest-remainder apportionment of `size` picks across levels, proportional to each level's pool size. */
function levelQuota(pool: CertificationQuestion[], size: number): Record<string, number> {
  const total = pool.length;
  const counts = CERTIFICATION_LEVEL_ORDER.map((level) => pool.filter((q) => q.level === level).length);
  const raw = counts.map((n) => (total > 0 ? (n / total) * size : 0));
  const base = raw.map(Math.floor);
  const remaining = size - base.reduce((a, b) => a + b, 0);
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining && k < byFraction.length; k++) base[byFraction[k].i]++;
  return Object.fromEntries(CERTIFICATION_LEVEL_ORDER.map((level, i) => [level, base[i]]));
}

/** Draws a new randomized exam of up to `size` questions, basic through advanced order, options shuffled. */
export function buildExamAttempt(pool: CertificationQuestion[], size: number): CertificationQuestion[] {
  const quota = levelQuota(pool, Math.min(size, pool.length));
  return CERTIFICATION_LEVEL_ORDER.flatMap((level) => {
    const levelPool = pool.filter((q) => q.level === level);
    return shuffle(levelPool)
      .slice(0, quota[level])
      .map(shuffleOptions);
  });
}
