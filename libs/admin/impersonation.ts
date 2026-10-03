// Super admin "view as" (read-only impersonation). The admin's own Supabase
// session cookies are never touched: the target user's access token lives in
// this separate httpOnly cookie, and libs/supabase/server.ts's createClient()
// swaps it in for every server-side query while it's present. proxy.ts
// re-checks on every request that the real session is still the super admin
// who started it, and blocks writes (see isReadOnlyAllowedRequest below).
//
// Pure helpers only — imported by proxy.ts, so no next/headers here.

export const IMPERSONATION_COOKIE = "admin_impersonation";

export const VIEW_ONLY_ERROR = "View-only mode: changes are disabled while viewing as another user.";

// Treat the session as over a little before the access token actually
// expires — auth-js tries to refresh inside its 90s expiry margin, and the
// impersonated session deliberately carries no refresh token.
const EXPIRY_MARGIN_SECONDS = 120;

export type Impersonation = {
  adminId: string;
  targetId: string;
  targetEmail: string;
  accessToken: string;
  // Unix seconds, from the target session's expires_at.
  expiresAt: number;
};

export function parseImpersonation(raw: string | undefined): Impersonation | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (
      typeof p?.adminId !== "string" ||
      typeof p?.targetId !== "string" ||
      typeof p?.targetEmail !== "string" ||
      typeof p?.accessToken !== "string" ||
      typeof p?.expiresAt !== "number"
    ) return null;
    return p as Impersonation;
  } catch {
    return null;
  }
}

export function isImpersonationLive(imp: Impersonation): boolean {
  return imp.expiresAt - EXPIRY_MARGIN_SECONDS > Date.now() / 1000;
}

// POST API routes that only read (or only write shared, non-user caches like
// keyword_rankings_history) — everything else non-GET under /api is blocked
// while impersonating. Server actions aren't covered here: proxy.ts can't
// tell which action a request targets, so each mutating action checks
// isImpersonating() itself.
const READ_ONLY_POST_ROUTES = new Set([
  "/api/keywords/search",
  "/api/keywords/performance-report",
  "/api/keywords/simulate",
  "/api/keywords/translate",
  "/api/market/compare/insights",
]);

export function isReadOnlyAllowedRequest(method: string, pathname: string, isServerAction: boolean): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  if (isServerAction) return true;
  return m === "POST" && READ_ONLY_POST_ROUTES.has(pathname);
}

// Defense in depth for the impersonated Supabase client: refuses every
// PostgREST/Storage/Auth write at the HTTP layer, so a code path that writes
// through createClient() can't modify the user's data even if nothing above
// it checked. Read-only RPCs (get_*) are POSTs too, so they're let through.
export const readOnlyFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const isRead =
    method === "GET" ||
    method === "HEAD" ||
    (method === "POST" && url.pathname.startsWith("/rest/v1/rpc/get_"));

  if (!isRead) {
    return new Response(
      JSON.stringify({ code: "42501", message: VIEW_ONLY_ERROR, details: null, hint: null }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  }
  return fetch(input, init);
};
