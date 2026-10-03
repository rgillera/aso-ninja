import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isMobileUserAgent } from "@/libs/user-agent";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import {
  IMPERSONATION_COOKIE,
  VIEW_ONLY_ERROR,
  isImpersonationLive,
  isReadOnlyAllowedRequest,
  parseImpersonation,
} from "@/libs/admin/impersonation";

const PROTECTED = ["/dashboard", "/workspace", "/mobile", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

// Plain startsWith would also match e.g. "/mobile-manifest.webmanifest"
// against "/mobile" — matches only the route itself or a nested segment.
function matchesRoute(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always call getUser() — verifies JWT with Supabase Auth server.
  // Never rely on getSession() in proxy/server code.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Super admin "view as" session (libs/admin/impersonation.ts). Only valid
  // while the real signed-in user is still the super admin who started it —
  // otherwise (signed out, switched accounts, expired) it's dropped here,
  // before any server code can read it.
  const impersonationRaw = request.cookies.get(IMPERSONATION_COOKIE)?.value;
  if (impersonationRaw) {
    const imp = parseImpersonation(impersonationRaw);
    const valid =
      !!imp && !!user && user.id === imp.adminId && isSuperAdminEmail(user.email) && isImpersonationLive(imp);

    if (!valid) {
      const res = request.method === "GET"
        ? NextResponse.redirect(request.nextUrl)
        : NextResponse.json({ error: "View-only session ended. Reload the page." }, { status: 403 });
      // Keep any session refresh getUser() just wrote above.
      response.cookies.getAll().forEach((c) => res.cookies.set(c));
      res.cookies.delete(IMPERSONATION_COOKIE);
      return res;
    }

    // The agent CRM is internal tooling, not part of the customer's view.
    if (matchesRoute(pathname, ["/agents"])) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!isReadOnlyAllowedRequest(request.method, pathname, request.headers.has("next-action"))) {
      return NextResponse.json({ error: VIEW_ONLY_ERROR }, { status: 403 });
    }
  }

  if (!user && matchesRoute(pathname, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && matchesRoute(pathname, AUTH_PAGES)) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/")
      ? next
      : isMobileUserAgent(request.headers.get("user-agent") ?? "")
        ? "/mobile"
        : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
