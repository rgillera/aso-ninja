import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/libs/gemini";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { MAX_COMPARE_APPS } from "@/features/market/compare/types";

export type CompareInsightApp = {
  name: string;
  store: "ios" | "android";
  developer: string;
  category: string;
  rating: number | null;
  ratingCount: number | null;
  daysSinceUpdate: number | null;
  ageYears: number | null;
  price: number;
  offersIAP: boolean | null;
  screenshotCount: number;
  hasPreviewVideo: boolean;
  // Rough monthly figures from libs/store/appEstimates.ts plus what each was
  // modeled from. Shares are of the compared set's total and computed by
  // the caller, so the model interprets real numbers instead of inventing any.
  estDownloads: number | null;
  estRevenue: number | null;
  downloadsBasis: string | null;
  revenueBasis: string | null;
  downloadsShare: number | null; // 0-100
  revenueShare: number | null; // 0-100
};

export type CompareInsightsResult = {
  summary: string;
  opportunity: string | null;
  // Same order as the request's apps.
  positions: ({ role: string; note: string } | null)[];
};

function money(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}K` : `$${n}`;
}

function formatApp(app: CompareInsightApp, index: number): string {
  const model = app.price > 0 ? `Paid (${money(app.price)})` : app.offersIAP === true ? "Free with in-app purchases" : app.offersIAP === false ? "Free, no in-app purchases" : "Free";
  const lines = [
    `${index + 1}. ${app.name} (${app.store === "ios" ? "App Store" : "Google Play"}) by ${app.developer || "unknown developer"}`,
    `   Category: ${app.category} | Business model: ${model} | Age: ${app.ageYears != null ? `${app.ageYears} years` : "unknown"} | Last updated: ${app.daysSinceUpdate != null ? `${app.daysSinceUpdate} days ago` : "unknown"}`,
    `   Rating: ${app.rating != null ? app.rating.toFixed(1) : "n/a"}${app.ratingCount != null ? ` from ${app.ratingCount.toLocaleString("en-US")} ratings` : ""} | Screenshots: ${app.screenshotCount} | Preview video: ${app.hasPreviewVideo ? "Yes" : "No"}`,
  ];
  if (app.estDownloads != null) {
    lines.push(`   Est. downloads/month: ${app.estDownloads < 5000 ? "under 5K" : app.estDownloads.toLocaleString("en-US")} (${app.downloadsShare ?? 0}% of this set; basis: ${app.downloadsBasis})`);
  }
  if (app.estRevenue != null) {
    lines.push(`   Est. revenue/month: ${app.estRevenue < 5000 ? "under $5K" : money(app.estRevenue)} (${app.revenueShare ?? 0}% of this set; basis: ${app.revenueBasis})`);
  }
  if (app.estDownloads && app.estRevenue != null) {
    lines.push(`   Revenue per download: $${(app.estRevenue / app.estDownloads).toFixed(2)}`);
  }
  return lines.join("\n");
}

function buildPrompt(apps: CompareInsightApp[], country: string): string {
  return `You are a mobile app market analyst sizing up ${apps.length} competing apps in the ${country} storefront. Download and revenue figures are rough model estimates (can be off by 2-5x), so reason about relative position and order of magnitude, never quote them as exact.

${apps.map(formatApp).join("\n\n")}

Write:
1. "summary": 3-4 sentences on the competitive landscape: who owns the market by downloads and by revenue, how their business models differ (paid, freemium, ad-supported), which apps monetize efficiently versus chase volume, and signs of momentum or stagnation (age, update recency, rating volume).
2. "opportunity": ONE sentence on the clearest opening in this market for a new or smaller app (an underserved monetization model, a weak leader, a stale incumbent). Be specific to these apps.
3. "positions": an array with exactly ${apps.length} entries in the same order as above, each {"role": "...", "note": "..."}. "role" is a 1-3 word label such as Market leader, Revenue leader, Volume play, Challenger, Niche player, Stagnant incumbent or Newcomer. "note" is ONE sentence on this app's market position and its main strength or vulnerability.

Plain text only: no markdown, and no em dashes.
Reply with ONLY this JSON shape, no explanation, no markdown fences:
{"summary": "...", "opportunity": "...", "positions": [{"role": "...", "note": "..."}]}`;
}

// POST /api/market/compare/insights  { workspaceId, country, apps: CompareInsightApp[] }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const apps = ((Array.isArray(body.apps) ? body.apps : []) as CompareInsightApp[]).slice(0, MAX_COMPARE_APPS);
  const country = typeof body.country === "string" && /^[A-Za-z]{2}$/.test(body.country) ? body.country.toUpperCase() : "US";

  if (apps.length < 2) {
    return NextResponse.json({ error: "Add at least 2 apps to generate insights." }, { status: 400 });
  }

  // Same cost-control shape as /api/keywords/ai-suggestions — verify the
  // workspace's actual plan server-side rather than trusting the client's
  // own lock check, which a direct API call could otherwise bypass.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "AI Insights requires the Pro+ plan or above." }, { status: 403 });
  }

  const prompt = buildPrompt(apps, country);
  const raw = await generateText(prompt, 0.4);
  if (!raw) return NextResponse.json({ error: "Couldn't reach the AI service right now." }, { status: 502 });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
    const parsed = JSON.parse(match[0]) as { summary?: unknown; opportunity?: unknown; positions?: unknown };
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const positionsRaw = Array.isArray(parsed.positions) ? parsed.positions : [];
    if (!summary) return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });

    const result: CompareInsightsResult = {
      summary,
      opportunity: typeof parsed.opportunity === "string" && parsed.opportunity.trim() ? parsed.opportunity.trim() : null,
      positions: apps.map((_, i) => {
        const v = positionsRaw[i] as { role?: unknown; note?: unknown } | undefined;
        const role = typeof v?.role === "string" ? v.role.trim() : "";
        const note = typeof v?.note === "string" ? v.note.trim() : "";
        return role && note ? { role, note } : null;
      }),
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
  }
}
