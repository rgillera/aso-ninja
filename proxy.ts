import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isMobileUserAgent } from "@/libs/user-agent";

const PROTECTED = ["/dashboard", "/workspace", "/mobile"];
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
