// Only fields the App Store/Play Store public APIs actually expose (see
// StoreData in libs/contracts/app/store-data.ts) — no promo text, slug,
// price, devices, keywords, or in-app purchases, since none of those are
// publicly readable for any app.
export const ALL_FIELDS = [
  "Title", "Subtitle", "Description", "Screenshots",
  "Preview Video", "Category", "Age Rating", "Localizations",
];

export const COL_W      = 32;  // px per day column
export const LABEL_W    = 52;  // px for the app-icon sticky column
export const DAYS_SHOWN = 50;  // number of days visible at once

// Gradient fallbacks for screenshot placeholders (used when no real URL available)
export const SS_GRADIENTS = [
  "from-blue-600 to-blue-900",
  "from-cyan-600 to-cyan-900",
  "from-indigo-600 to-indigo-900",
  "from-violet-600 to-violet-900",
  "from-teal-600 to-teal-900",
  "from-sky-600 to-sky-900",
  "from-purple-600 to-purple-900",
  "from-blue-500 to-cyan-800",
];
