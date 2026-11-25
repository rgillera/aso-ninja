import { createHmac, timingSafeEqual } from "node:crypto";

// Growth Starter Pro+ bonus links. A year of Pro+ (instead of Pro) is offered
// on the strategy call, for buyers who purchase by a deadline, so it is not part of the
// public offer. A bonus link carries a signed deadline: one link per
// deadline, shared by everyone told about it, that stops working on its own.
//
// Two kinds of token:
//   "<YYYYMMDD>.<signature>"  a deadline day, lasting until that day ends in
//                             the last time zone on Earth (UTC-12), so the
//                             date in the email holds wherever the buyer is.
//   "h<unix seconds>.<signature>"  a timed offer for a follow-up email.
//   "c<unix seconds>.<signature>"  a timed offer for the call only, so the
//                             page can say it's from the call.
//                             Timed offers last one of TIMED_OFFER_MINUTES
//                             from when they're made. The token holds its end
//                             time, so changing these lengths never affects
//                             links already sent. Signed under a different
//                             prefix, and the letter is part of what's signed,
//                             so no token's signature can be reused for
//                             another kind.

export const TIMED_OFFER_MINUTES = [24 * 60, 60] as const;
export type TimedOfferMinutes = (typeof TIMED_OFFER_MINUTES)[number];
export const CALL_OFFER_MINUTES: TimedOfferMinutes = 60;

export function parseTimedOfferMinutes(value: string | undefined): TimedOfferMinutes | null {
  const n = Number(value);
  return (TIMED_OFFER_MINUTES as readonly number[]).includes(n) ? (n as TimedOfferMinutes) : null;
}

// "30 minutes", "24 hours", "1 hour".
export function formatOfferDuration(minutes: number): string {
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}
const TIMED_RE = /^([hc])(\d{9,11})$/;

const DAY_RE = /^(\d{4})(\d{2})(\d{2})$/;

function secret(): string | null {
  return process.env.GROWTH_STARTER_OFFER_SECRET || null;
}

function sign(day: string, key: string): string {
  return createHmac("sha256", key).update(`growth-starter-pro:${day}`).digest("base64url").slice(0, 22);
}

function parseDay(day: string): { y: number; m: number; d: number } | null {
  const match = DAY_RE.exec(day);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { y, m, d };
}

function expiresAt({ y, m, d }: { y: number; m: number; d: number }): Date {
  // End of the day at UTC-12 is 12:00 UTC the next day.
  return new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
}

export type OfferKind = "day" | "timed" | "call";

export type GrowthStarterOffer = {
  token: string;
  // "day": "Friday, November 13", for the page and emails. "timed" (follow-up
  // email) and "call": "the next 23 hours" at the time it's read (the buyer's
  // time zone is unknown, so no clock time).
  kind: OfferKind;
  deadlineLabel: string;
  expiresAt: Date;
};

function signTimed(stamp: string, key: string): string {
  return createHmac("sha256", key).update(`growth-starter-pro-call:${stamp}`).digest("base64url").slice(0, 22);
}

function hoursLeftLabel(end: Date): string {
  const minutes = Math.max(1, Math.ceil((end.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return minutes === 1 ? "the next minute" : `the next ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "the next hour" : `the next ${hours} hours`;
}

// A timed bonus link, valid for `minutes` from now.
export function createGrowthStarterTimedOfferToken(minutes: TimedOfferMinutes): GrowthStarterOffer | { error: string } {
  const key = secret();
  if (!key) return { error: "GROWTH_STARTER_OFFER_SECRET is not set." };
  const end = new Date(Date.now() + minutes * 60_000);
  const kind = minutes === CALL_OFFER_MINUTES ? "call" : "timed";
  const stamp = `${kind === "call" ? "c" : "h"}${Math.floor(end.getTime() / 1000)}`;
  return { token: `${stamp}.${signTimed(stamp, key)}`, kind, deadlineLabel: hoursLeftLabel(end), expiresAt: end };
}

function labelFor({ y, m, d }: { y: number; m: number; d: number }): string {
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// deadline is "YYYY-MM-DD" (a date input's value).
export function createGrowthStarterOfferToken(deadline: string): GrowthStarterOffer | { error: string } {
  const key = secret();
  if (!key) return { error: "GROWTH_STARTER_OFFER_SECRET is not set." };
  const day = deadline.replaceAll("-", "");
  const parts = parseDay(day);
  if (!parts) return { error: "Pick a valid date." };
  const end = expiresAt(parts);
  if (end.getTime() <= Date.now()) return { error: "That date has already passed." };
  return { token: `${day}.${sign(day, key)}`, kind: "day", deadlineLabel: labelFor(parts), expiresAt: end };
}

export type OfferCheck =
  | { status: "valid"; offer: GrowthStarterOffer }
  | { status: "expired"; kind: OfferKind; deadlineLabel: string }
  | { status: "invalid" };

export function checkGrowthStarterOfferToken(token: string | null | undefined): OfferCheck {
  const key = secret();
  if (!token || !key) return { status: "invalid" };
  const [day, signature] = token.split(".");

  const timed = day ? TIMED_RE.exec(day) : null;
  if (timed) {
    if (!signature) return { status: "invalid" };
    const expected = Buffer.from(signTimed(day, key));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { status: "invalid" };
    const kind = timed[1] === "c" ? "call" : "timed";
    const end = new Date(Number(timed[2]) * 1000);
    // Expired call offers name the day it ran out, in UTC.
    const endLabel = end.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
    if (end.getTime() <= Date.now()) return { status: "expired", kind, deadlineLabel: endLabel };
    return { status: "valid", offer: { token, kind, deadlineLabel: hoursLeftLabel(end), expiresAt: end } };
  }

  const parts = day ? parseDay(day) : null;
  if (!parts || !signature) return { status: "invalid" };

  const expected = Buffer.from(sign(day, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { status: "invalid" };

  const end = expiresAt(parts);
  if (end.getTime() <= Date.now()) return { status: "expired", kind: "day", deadlineLabel: labelFor(parts) };
  return { status: "valid", offer: { token, kind: "day", deadlineLabel: labelFor(parts), expiresAt: end } };
}
