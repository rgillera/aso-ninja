import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  IMPERSONATION_COOKIE,
  isImpersonationLive,
  parseImpersonation,
  readOnlyFetch,
  type Impersonation,
} from "@/libs/admin/impersonation";

// Request-scoped client. While a super admin is viewing as another user
// (see libs/admin/impersonation.ts), this returns a read-only client
// authenticated as that user instead, so every page and route renders their
// data without knowing impersonation exists. Code that must act as the real
// signed-in admin (the /admin panel, starting/stopping impersonation) uses
// createRealUserClient() instead.
export async function createClient() {
  const impersonation = await getImpersonation();
  if (impersonation) return createImpersonatedClient(impersonation);
  return createRealUserClient();
}

export async function createRealUserClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies can only be mutated
            // inside Server Actions or Route Handlers.
          }
        },
      },
    }
  );
}

// Whether this request is a super admin's view-only session. proxy.ts has
// already verified the cookie belongs to the signed-in super admin and
// cleared it otherwise, so only shape/expiry are re-checked here.
export async function getImpersonation(): Promise<Impersonation | null> {
  const cookieStore = await cookies();
  const imp = parseImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value);
  return imp && isImpersonationLive(imp) ? imp : null;
}

export async function isImpersonating(): Promise<boolean> {
  return (await getImpersonation()) !== null;
}

const IMPERSONATION_STORAGE_KEY = "sb-impersonation-auth-token";

function createImpersonatedClient(imp: Impersonation) {
  // Fed to @supabase/ssr as if it were its own session cookie. No refresh
  // token (proxy.ts ends impersonation before expiry instead) and no user
  // object — getUser() fetches the real one from Supabase Auth.
  const session = JSON.stringify({
    access_token: imp.accessToken,
    refresh_token: "",
    expires_at: imp.expiresAt,
    expires_in: Math.max(0, imp.expiresAt - Math.floor(Date.now() / 1000)),
    token_type: "bearer",
    user: null,
  });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: IMPERSONATION_STORAGE_KEY },
      global: { fetch: readOnlyFetch },
      cookies: {
        getAll() {
          return [{ name: IMPERSONATION_STORAGE_KEY, value: session }];
        },
        // Never write: anything auth-js tries to persist here would land in
        // the admin's own browser.
        setAll() {},
      },
    }
  );
}
