import type { UpdateEvent } from "./types";

export const ALL_FIELDS = [
  "Title", "Subtitle", "Promo text", "Description", "Slug",
  "Price", "Devices", "Features", "Screenshots", "Preview Video",
  "Category", "Age Rating", "In-App Purchases", "Keywords", "Localizations",
];

// Template events — {{app}} / {{slug}} substituted per app at render time
export const EVENT_TEMPLATES: UpdateEvent[] = [
  {
    date: "2026-03-28", versionBefore: "7.1.1", versionAfter: "7.1.2",
    fields: [
      { field: "Title", before: "{{app}} Original",  after: "{{app}} – New Edition" },
      { field: "Slug",  before: "{{slug}}-original", after: "{{slug}}-new-edition" },
    ],
  },
  {
    date: "2026-04-02", versionBefore: "7.1.2", versionAfter: "7.1.4",
    fields: [
      { field: "Title",    before: "{{app}} – New Edition", after: "{{app}}: Pro" },
      { field: "Subtitle", before: "The original app",      after: "Smarter. Faster. Better." },
      { field: "Slug",     before: "{{slug}}-new-edition",  after: "{{slug}}-pro" },
    ],
  },
  {
    date: "2026-04-20", versionBefore: "7.1.4", versionAfter: "7.1.5",
    fields: [
      { field: "Description", before: "Use {{app}} every day.", after: "{{app}} helps you do more every day — smarter and faster than ever." },
      { field: "Promo text",  before: "",                      after: "Try {{app}} free today!" },
    ],
  },
  {
    date: "2026-04-26", versionBefore: "7.1.5", versionAfter: "7.1.6",
    fields: [
      {
        field: "Screenshots",
        before: "5 screenshots",
        after:  "7 screenshots",
        screenshotsBefore: [
          { status: "repositioned" },
          { status: "repositioned" },
          { status: "repositioned" },
          { status: "repositioned" },
          { status: "repositioned" },
        ],
        screenshotsAfter: [
          { status: "repositioned" },
          { status: "repositioned" },
          { status: "repositioned" },
          { status: "added" },
          { status: "added" },
          { status: "added" },
          { status: "added" },
        ],
      },
    ],
  },
  {
    date: "2026-05-07", versionBefore: "7.1.6", versionAfter: "7.2.0",
    fields: [
      { field: "Price", before: "$0.99",        after: "Free" },
      { field: "Title", before: "{{app}}: Pro", after: "{{app}} — Official" },
    ],
  },
  {
    date: "2026-06-10", versionBefore: "7.2.0", versionAfter: "7.2.1",
    fields: [
      { field: "Keywords", before: "app,utility,tools", after: "app,utility,tools,pro,2026" },
    ],
  },
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
