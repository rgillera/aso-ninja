// iPadOS Safari has reported a desktop-Mac User-Agent by default since
// iPadOS 13, and Android tablets omit "Mobile" from theirs — so this
// reliably matches phone-class devices only, with no extra tablet-exclusion
// logic needed. Tablets fall through to the regular dashboard.
//
// Kept dependency-free (no next/headers) so it's safe to import from
// proxy.ts — Edge Middleware can't use next/headers's request-scoped APIs.
const MOBILE_UA_RE = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/;

export function isMobileUserAgent(ua: string): boolean {
  return MOBILE_UA_RE.test(ua);
}
