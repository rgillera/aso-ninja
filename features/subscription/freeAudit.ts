// In-app entry points to the free ASO audit (booked as a call, where the
// Growth Sprint is pitched). Each placement tags its link with utm_medium so
// booked calls can be traced back to where they came from.
export type AuditPlacement = "subscription_card" | "dashboard_banner" | "sidebar";

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

// Booking link; falls back to email when no Calendly URL is configured.
export function freeAuditLink(placement: AuditPlacement) {
  if (!calendlyUrl) return { href: "mailto:hello@appaso.io?subject=Free%20ASO%20audit", external: false };
  const url = new URL(calendlyUrl);
  url.searchParams.set("utm_source", "app");
  url.searchParams.set("utm_medium", placement);
  url.searchParams.set("utm_campaign", "free_audit");
  return { href: url.toString(), external: true };
}
