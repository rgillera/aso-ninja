import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/libs/gemini";
import { fetchStoreData } from "@/libs/store/load-benchmark";
import { createAdminClient } from "@/libs/supabase/admin";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

export type SuggestPromptsResult = { placeholder: string; suggestions: string[] };

// One Gemini call covers both the input's placeholder text and the row of
// suggestion pills — a single request grounded in the app's real store
// listing (genre/subtitle/description) infers what kind of app this
// actually is (e.g. "workout app" vs "calorie counter" — categories the App
// Store's own genre field is too coarse to tell apart on its own), rather
// than issuing two separate calls for what's really one classification.
function buildPrompt(appName: string, genre: string, subtitle: string, description: string): string {
  const context = [
    `App name: ${appName}`,
    genre ? `Category: ${genre}` : null,
    subtitle ? `Subtitle: ${subtitle}` : null,
    description ? `Description: ${description.slice(0, 500)}` : null,
  ].filter(Boolean).join("\n");

  return `You help an app's developer figure out how real users would ask an AI assistant (like ChatGPT or Gemini) for an app like theirs.

${context}

Based on what this app actually does, write:
1. "placeholder": ONE short, natural discovery question a real person might type into an AI assistant when looking for an app like this — phrased the way people actually search, e.g. "best budgeting app" or "app to track my workouts". 3-7 words. Specific to what this app actually does, not generic.
2. "suggestions": an array of 12 different realistic discovery questions a real person might ask an AI assistant that this app could plausibly come up in the answer to. Vary the phrasing and angle (some short "best X app" style, some more specific like "app to help me Y") — no two should be near-duplicates of each other.

Reply with ONLY this JSON shape, no explanation, no markdown fences:
{"placeholder": "...", "suggestions": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]}`;
}

// GET /api/ai-visibility/suggest-prompts?appName=&store=&storeId=&bundleId=&country=&workspaceId=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appName = searchParams.get("appName") ?? "";
  const store = searchParams.get("store") ?? "ios";
  const storeId = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const country = (searchParams.get("country") ?? "us").toLowerCase();
  const workspaceId = searchParams.get("workspaceId") ?? "";

  if (!appName) return NextResponse.json({ error: "Missing app name" }, { status: 400 });

  // Same cost-control shape as /api/ai-visibility/check — this calls Gemini,
  // so it needs its own server-side plan check rather than relying on the
  // page's FeatureLocked gate alone.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "AI Visibility requires the Pro+ plan or above." }, { status: 403 });
  }

  // The same real app produces the same result regardless of which
  // workspace is asking, so this is cached globally by the app's real-world
  // identity (store + its store-specific id + country) rather than per
  // workspace — mirrors ai_visibility_answers' "shared by the real thing,
  // not the workspace-scoped row" caching. Falls back to appName only when
  // neither id is available (e.g. a not-yet-resolved preview) — still
  // caches correctly for repeat visits within that case, just without the
  // cross-workspace sharing.
  const identity = (store === "ios" ? storeId : bundleId) || appName.toLowerCase().trim();
  const appKey = `${store}|${identity}|${country}`;
  const today = new Date().toISOString().split("T")[0];
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("ai_visibility_suggestion_cache")
    .select("placeholder, suggestions")
    .eq("app_key", appKey)
    .eq("checked_on", today)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ placeholder: cached.placeholder, suggestions: cached.suggestions } satisfies SuggestPromptsResult);
  }

  const storeData = await fetchStoreData(store, storeId, bundleId, country).catch(() => null);

  const prompt = buildPrompt(
    appName,
    storeData?.primaryGenreName ?? "",
    storeData?.subtitle ?? "",
    storeData?.description ?? ""
  );

  const raw = await generateText(prompt, 0.6);
  if (!raw) return NextResponse.json({ error: "Couldn't reach the AI service right now." }, { status: 502 });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
    const parsed = JSON.parse(match[0]) as { placeholder?: unknown; suggestions?: unknown };
    const placeholder = typeof parsed.placeholder === "string" ? parsed.placeholder.trim() : "";
    const suggestions = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (!placeholder && !suggestions.length) {
      return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
    }

    await admin.from("ai_visibility_suggestion_cache").upsert(
      { app_key: appKey, checked_on: today, placeholder, suggestions },
      { onConflict: "app_key,checked_on" }
    );

    return NextResponse.json({ placeholder, suggestions } satisfies SuggestPromptsResult);
  } catch {
    return NextResponse.json({ error: "Couldn't parse the AI response." }, { status: 502 });
  }
}
