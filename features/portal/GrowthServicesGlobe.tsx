import { CheckIcon } from "@heroicons/react/20/solid";

// Decorative banner for the Growth Services hero: a static wireframe globe
// with a lit sphere fill and abstract landmasses, a pin over the Philippines,
// and a dashed route back to a muted "US hire" marker, visualizing the
// "outsource instead of hiring locally" pitch, plus a floating pop-up card
// calling out the headline reasons it works. Pure inline SVG (no external
// assets, no animation) so it matches the rest of the portal's hand-drawn
// hero graphics.

const popupPoints = ["Highly skilled", "Affordable", "Whole team", "Fast to start", "No lock-in"];

// Faint scattered dots across the canvas for ambient texture — a few sit
// inside the globe clip (as unlabeled "other locations"), the rest float in
// the surrounding space so the taller banner doesn't read as empty.
const AMBIENT_DOTS = [
  { cx: 90, cy: 90, r: 1.5 }, { cx: 140, cy: 340, r: 1.5 }, { cx: 60, cy: 420, r: 1 },
  { cx: 250, cy: 80, r: 1 }, { cx: 820, cy: 380, r: 1.5 }, { cx: 880, cy: 120, r: 1 },
  { cx: 900, cy: 300, r: 1.5 }, { cx: 760, cy: 430, r: 1 }, { cx: 320, cy: 420, r: 1 },
];

export function GrowthServicesGlobe() {
  return (
    <div className="relative mx-auto mb-12 max-w-5xl px-6 lg:px-8">
      <div aria-hidden="true" className="absolute inset-0 -z-10 blur-3xl">
        <div className="mx-auto h-full w-2/3 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 opacity-20" />
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gray-800/40 ring-1 ring-white/10">
        <svg
          viewBox="0 0 1000 480"
          className="block w-full h-auto"
          role="img"
          aria-label="Globe highlighting a growth team in the Philippines, connected to a marker over the US"
        >
          <defs>
            <radialGradient id="gsg-sphere" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
            <clipPath id="gsg-globe-clip">
              <circle cx="500" cy="240" r="170" />
            </clipPath>
          </defs>

          {/* Ambient background texture */}
          {AMBIENT_DOTS.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} className="fill-indigo-300/25" />
          ))}

          {/* Lit sphere fill, sits under the wireframe and landmasses */}
          <circle cx="500" cy="240" r="170" fill="url(#gsg-sphere)" />

          <g clipPath="url(#gsg-globe-clip)">
            {/* Abstract landmasses, not geographically literal, just enough
                to read as "world map" rather than a bare grid */}
            <path
              d="M 405 130 C 435 118 462 135 456 165 C 476 182 470 218 448 235 C 462 262 442 292 412 284 C 388 276 390 244 396 220 C 374 202 380 168 400 150 C 397 142 399 134 405 130 Z"
              className="fill-indigo-300/[0.09]"
            />
            <path
              d="M 545 160 C 590 140 645 152 668 182 C 690 200 682 228 658 236 C 674 260 654 288 626 282 C 636 306 610 326 585 312 C 562 322 546 300 554 280 C 528 264 524 230 542 206 C 528 188 534 170 545 160 Z"
              className="fill-indigo-300/[0.11]"
            />
            {/* Latitude / longitude wireframe */}
            <circle cx="500" cy="240" r="170" fill="none" className="stroke-indigo-400/25" strokeWidth="1.5" />
            <ellipse cx="500" cy="240" rx="170" ry="125" fill="none" className="stroke-indigo-400/15" strokeWidth="1" />
            <ellipse cx="500" cy="240" rx="170" ry="68" fill="none" className="stroke-indigo-400/15" strokeWidth="1" />
            <line x1="330" y1="240" x2="670" y2="240" className="stroke-indigo-400/20" strokeWidth="1" />
            <ellipse cx="500" cy="240" rx="125" ry="170" fill="none" className="stroke-indigo-400/15" strokeWidth="1" />
            <ellipse cx="500" cy="240" rx="68" ry="170" fill="none" className="stroke-indigo-400/15" strokeWidth="1" />
            <line x1="500" y1="70" x2="500" y2="410" className="stroke-indigo-400/20" strokeWidth="1" />

            {/* Unlabeled dots for other locations, quiet next to the highlighted pin */}
            <circle cx="430" cy="200" r="2" className="fill-indigo-300/40" />
            <circle cx="560" cy="330" r="2" className="fill-indigo-300/40" />
          </g>
          <circle cx="500" cy="240" r="170" fill="none" className="stroke-indigo-400/25" strokeWidth="1.5" />

          {/* Route from the US marker to the Philippines pin */}
          <path
            d="M 175 185 Q 500 45 628 280"
            fill="none"
            className="stroke-gray-500/40"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* US marker: muted, no pulse */}
          <circle cx="175" cy="185" r="4.5" className="fill-gray-500" />

          {/* Small team dots clustered near the Philippines */}
          <circle cx="653" cy="262" r="2.5" className="fill-indigo-300/60" />
          <circle cx="618" cy="305" r="2.5" className="fill-indigo-300/60" />
          <circle cx="648" cy="305" r="2" className="fill-indigo-300/50" />

          {/* Philippines pin */}
          <circle cx="628" cy="280" r="9" fill="none" className="stroke-indigo-400/40" strokeWidth="1.5" />
          <circle cx="628" cy="280" r="4.5" className="fill-indigo-400" />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <span
            className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-gray-400 ring-1 ring-white/10"
            style={{ left: "17.5%", top: "38.5%" }}
          >
            🇺🇸 In-house hire (US)
          </span>
          <span
            className="absolute -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-indigo-900/40"
            style={{ left: "62.8%", top: "58.3%" }}
          >
            Your growth team 🇵🇭
          </span>

          {/* Floating pop-up card, the headline reasons the pitch works.
              Positioned by percentage (not fixed spacing) so it scales down
              with the banner instead of swallowing it on narrow screens. */}
          <div
            className="absolute max-w-[8.5rem] overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/40 ring-1 ring-black/5 sm:max-w-none sm:rounded-xl"
            style={{ top: "4%", right: "4%" }}
          >
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-400" />
            <div className="p-1.5 sm:p-4">
              <p className="mb-0.5 text-[7px] font-semibold tracking-wider text-gray-400 uppercase sm:mb-2 sm:text-[10px]">
                Why it works
              </p>
              {/* All points show at every size, sized down enough on narrow
                  screens to still stay clear of the pin label below. */}
              <ul className="space-y-0.5 sm:space-y-1.5">
                {popupPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-1 text-[9px] leading-none font-semibold text-gray-900 sm:gap-1.5 sm:text-sm"
                  >
                    <span className="flex size-3 shrink-0 items-center justify-center rounded-full bg-emerald-100 sm:size-4">
                      <CheckIcon className="size-1.5 text-emerald-600 sm:size-2.5" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
