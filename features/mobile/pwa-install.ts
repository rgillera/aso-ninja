// Shared by InstallBanner.tsx and NotificationSettingsList.tsx — client-only
// checks (navigator/window aren't available during SSR), so callers must
// only invoke these from an effect or event handler, never at render time.

export function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

// iOS Safari only exposes the Push API to a PWA once it's been added to the
// home screen (standalone display mode) — a regular browser tab reports
// "unsupported" regardless of iOS version. matchMedia is the modern check;
// navigator.standalone is the older iOS-specific fallback some versions need.
export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
