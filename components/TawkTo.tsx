"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    Tawk_API?: { hideWidget?: () => void; showWidget?: () => void; maximize?: () => void; onLoad?: () => void };
  }
}

// App Explorer users are frequently mid-comparison across many app rows;
// the chat bubble sits over the connect/unconnect button in the rightmost
// column, so the widget is hidden on that page specifically. The dashboard
// layout persists across client-side navigation, so the widget (once
// loaded) is toggled via Tawk's own show/hideWidget API rather than
// mounted/unmounted, which wouldn't undo its already-injected DOM.
const EXCLUDED_PATH_PREFIXES = ["/dashboard/market/explorer"];

export function TawkTo() {
  const pathname = usePathname();
  const hidden = EXCLUDED_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    function applyVisibility() {
      if (hidden) window.Tawk_API?.hideWidget?.();
      else window.Tawk_API?.showWidget?.();
    }
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onLoad = applyVisibility;
    applyVisibility();
  }, [hidden]);

  return (
    <Script id="tawk-to" strategy="lazyOnload">
      {`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/6a4bc937e9d50b1d4f4058d3/1jss0k0et';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}
    </Script>
  );
}
