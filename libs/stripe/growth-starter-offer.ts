import { createHmac, timingSafeEqual } from "node:crypto";

// Growth Starter Pro bonus links. The year of Pro is offered on the strategy
// call, for buyers who purchase by a deadline, so it is not part of the
// public offer. A bonus link carries a signed deadline: one link per
// deadline, shared by everyone told about it, that stops working on its own.
//
// Token: "<YYYYMMDD>.<signature>". The deadline is a whole day, and it lasts
// until that day ends in the last time zone on Earth (UTC-12), so the date in
// the email holds wherever the buyer is.

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
  // "Friday, November 13", for the page and emails.
  deadlineLabel: string;
  expiresAt: Date;
};

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
  return { token: `${day}.${sign(day, key)}`, deadlineLabel: labelFor(parts), expiresAt: end };
}

export type OfferCheck =
  | { status: "valid"; offer: GrowthStarterOffer }
  | { status: "expired"; deadlineLabel: string }
  | { status: "invalid" };

export function checkGrowthStarterOfferToken(token: string | null | undefined): OfferCheck {
  const key = secret();
  if (!token || !key) return { status: "invalid" };
  const [day, signature] = token.split(".");
  const parts = day ? parseDay(day) : null;
  if (!parts || !signature) return { status: "invalid" };

  const expected = Buffer.from(sign(day, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { status: "invalid" };

  const end = expiresAt(parts);
  if (end.getTime() <= Date.now()) return { status: "expired", deadlineLabel: labelFor(parts) };
  return { status: "valid", offer: { token, deadlineLabel: labelFor(parts), expiresAt: end } };
}
