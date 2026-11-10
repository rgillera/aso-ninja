import { createHmac, timingSafeEqual } from "node:crypto";

// Growth Starter Pro bonus links. The year of Pro is offered on the strategy
// call, for buyers who purchase by a deadline, so it is not part of the
// public offer. A bonus link carries a signed deadline: one link per
// deadline, shared by everyone told about it, that stops working on its own.
//
// Two kinds of token:
//   "<YYYYMMDD>.<signature>"  a deadline day, lasting until that day ends in
//                             the last time zone on Earth (UTC-12), so the
//                             date in the email holds wherever the buyer is.
//   "h<unix seconds>.<signature>"  a timed offer, valid for one of
//                             TIMED_OFFER_HOURS from when it's made: 24 hours
//                             for a follow-up email, 2 for the call only.
//                             Signed under a different prefix, so a day
//                             token's signature can't be reused for one.

export const TIMED_OFFER_HOURS = [24, 2] as const;
export type TimedOfferHours = (typeof TIMED_OFFER_HOURS)[number];

export function parseTimedOfferHours(value: string | undefined): TimedOfferHours | null {
  const n = Number(value);
  return (TIMED_OFFER_HOURS as readonly number[]).includes(n) ? (n as TimedOfferHours) : null;
}
const TIMED_RE = /^h(\d{9,11})$/;

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

export type GrowthStarterOffer = {
  token: string;
  // "day": "Friday, November 13", for the page and emails. "call": "the
  // next 23 hours" at the time it's read (the buyer's time zone is unknown,
  // so no clock time).
  kind: "day" | "call";
  deadlineLabel: string;
  expiresAt: Date;
};

function signTimed(stamp: string, key: string): string {
  return createHmac("sha256", key).update(`growth-starter-pro-call:${stamp}`).digest("base64url").slice(0, 22);
}

function hoursLeftLabel(end: Date): string {
  const hours = Math.max(1, Math.ceil((end.getTime() - Date.now()) / 3_600_000));
  return hours === 1 ? "the next hour" : `the next ${hours} hours`;
}

// A timed bonus link, valid for `hours` from now.
export function createGrowthStarterTimedOfferToken(hours: TimedOfferHours): GrowthStarterOffer | { error: string } {
  const key = secret();
  if (!key) return { error: "GROWTH_STARTER_OFFER_SECRET is not set." };
  const end = new Date(Date.now() + hours * 3_600_000);
  const stamp = `h${Math.floor(end.getTime() / 1000)}`;
  return { token: `${stamp}.${signTimed(stamp, key)}`, kind: "call", deadlineLabel: hoursLeftLabel(end), expiresAt: end };
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
  | { status: "expired"; kind: "day" | "call"; deadlineLabel: string }
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
    const end = new Date(Number(timed[1]) * 1000);
    // Expired call offers name the day it ran out, in UTC.
    const endLabel = end.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
    if (end.getTime() <= Date.now()) return { status: "expired", kind: "call", deadlineLabel: endLabel };
    return { status: "valid", offer: { token, kind: "call", deadlineLabel: hoursLeftLabel(end), expiresAt: end } };
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
