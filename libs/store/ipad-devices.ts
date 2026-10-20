// iPad-only apps never appear in entity=software (iPhone) search results, so
// rank for them has to come from a separate entity=iPadSoftware search. Pure
// (no server imports) so the browser can use it too — see liveSearch.ts.
export function isIpadOnlyListing(r: { supportedDevices?: string[] }): boolean {
  const devices = r.supportedDevices ?? [];
  return devices.some((d) => d.startsWith("iPad")) && !devices.some((d) => d.startsWith("iPhone") || d.startsWith("iPod"));
}
