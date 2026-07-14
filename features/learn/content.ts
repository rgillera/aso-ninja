import {
  BookOpenIcon,
  DocumentChartBarIcon,
  RectangleStackIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ListBulletIcon,
  StarIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import type { PlanSlug } from "@/libs/contracts";

export type LearnIcon = typeof DocumentChartBarIcon;

export type LearnTopic = {
  id: string;
  label: string;
  icon: LearnIcon;
  /** Minimum plan the feature itself requires; omitted when available on every plan. */
  minPlan?: PlanSlug;
  /** What this tool is for, in plain language. */
  description: string;
  /** Why it matters — the value a user gets out of it. */
  benefits: string[];
  /** How people actually use it day to day. */
  howToUse: string[];
  goodToKnow: string[];
  /** Optional call-to-action section shown at the end of the topic (e.g. book a demo). */
  cta?: { heading: string; body: string; label: string; href: string };
};

export type LearnGroup = {
  id: string;
  label: string;
  icon: LearnIcon;
  topics: LearnTopic[];
};

export const LEARN_GROUPS: LearnGroup[] = [
  {
    id: "introduction",
    label: "Introduction",
    icon: BookOpenIcon,
    topics: [
      {
        id: "introduction",
        label: "Introduction",
        icon: BookOpenIcon,
        description:
          "This is your starting point for ASO Intelligence — the tools inside aso.ninja that help you understand, improve, and track your app's presence in the App Store and Google Play.",
        benefits: [
          "One workspace to audit your listing, discover keywords, and track ratings and reviews, instead of juggling spreadsheets and separate tools",
          "Every tool shares the same tracked app and workspace, so data stays consistent as you move between Reports, Metadata, Keywords, and Reviews",
          "Built for iterative improvement — establish a baseline, make a change, then come back and check whether it actually worked",
        ],
        howToUse: [
          "Start with Reports for a quick health check of your current store listing",
          "Use Metadata — Preview, Timeline, and Benchmark — to draft, review, and benchmark your listing's text and creative",
          "Use Keywords — Research, Combinations, Performance, and Ranked — to find, track, and monitor the terms your app should rank for",
          "Use Reviews & Ratings to track your star rating, read user feedback, and turn it into a concrete improvement plan",
          "Pick a topic from the list on the left at any time to see exactly what it's for, why it matters, and how to use it",
        ],
        goodToKnow: [
          "A Basic, Pro, or Pro+ label next to a topic shows the minimum plan required to use that feature",
          "This guide covers ASO Intelligence only — Market Intelligence (App Explorer) isn't included here",
          "To get the full benefit of this, we recommend you getting Pro+ to unlock full research and tracking functionality",
        ],
        cta: {
          heading: "Need help?",
          body: "We have a dedicated live customer support team to help you if you have any questions, or if you'd like, you can book a demo below.",
          label: "Book a demo",
          href: "https://calendly.com/app-aso/aso-audit",
        },
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: DocumentChartBarIcon,
    topics: [
      {
        id: "reports",
        label: "Reports",
        icon: DocumentChartBarIcon,
        description:
          "Reports is your app's overall ASO health check. It's for anyone who wants a fast, honest answer to \"how good is our store listing, really?\" instead of guessing.",
        benefits: [
          "Get an objective ASO Score instead of relying on gut feel about your listing",
          "See exactly which area — text, visuals, or details — is holding your score back, so effort goes where it matters",
          "Compare directly against the competitors you actually care about, not just an abstract industry average",
          "Turn vague advice like \"improve your ASO\" into a concrete, prioritized list of fixes",
        ],
        howToUse: [
          "Check your ASO Score whenever you're about to plan a listing update, and again after it goes live to confirm it helped",
          "Add your closest rivals to unlock a side-by-side score and metadata comparison",
          "Work through ASO Suggestions like a checklist, dismissing each one as you act on it",
          "On Pro+, lean on the AI-generated suggestions for extra rewrite ideas when you're stuck",
        ],
        goodToKnow: [
          "The score, competitor comparison, and metadata comparison are available on every plan, subject to your plan's competitor limit",
          "AI-generated suggestions in the ASO Suggestions panel require Pro+",
        ],
      },
    ],
  },
  {
    id: "metadata",
    label: "Metadata",
    icon: RectangleStackIcon,
    topics: [
      {
        id: "metadata-preview",
        label: "Preview",
        icon: EyeIcon,
        description:
          "Preview is a safe sandbox for rewriting your store listing. It's for trying out new copy or creative and seeing exactly how it will look before you commit to anything live.",
        benefits: [
          "Test new titles, subtitles, and descriptions without any risk to your live listing",
          "Catch character-limit and truncation problems before you submit an update to the store",
          "See your listing the way a shopper actually sees it, in a real search-results mock-up",
          "Avoid keyword-stuffing or thin descriptions by checking density before you publish",
        ],
        howToUse: [
          "Draft new copy for any field and watch the live character counter as you go",
          "Drop in new screenshots, an icon, or a preview video to see them rendered instantly",
          "Use Search Preview to sanity-check how the listing reads in results",
          "Use Compare versions to weigh a draft against what's currently live before deciding to ship it",
        ],
        goodToKnow: [
          "Edits here are local \"what-if\" trials — nothing is published to the real store listing",
          "Available on every plan",
        ],
      },
      {
        id: "metadata-timeline",
        label: "Timeline",
        icon: ClockIcon,
        minPlan: "basic",
        description:
          "Timeline is your listing's history book. It's for understanding what changed in the past and connecting the dots between a specific update and what happened afterward.",
        benefits: [
          "See exactly what was changed at any past update, not just that something changed",
          "Connect a metadata change to a later shift in rating, rank, or reviews",
          "Learn from your own track record — spot which past changes actually helped",
        ],
        howToUse: [
          "Narrow to a date range and the specific fields you're investigating",
          "Click any update on the timeline to open its before/after comparison",
          "Turn on diff highlighting to catch subtle wording changes quickly",
        ],
        goodToKnow: ["Requires the Basic plan or above"],
      },
      {
        id: "metadata-benchmark",
        label: "Benchmark",
        icon: ChartBarIcon,
        minPlan: "basic",
        description:
          "Benchmark tells you whether your metadata is actually competitive. It's for anyone who wants to know if their listing measures up to category peers, not just to a generic checklist.",
        benefits: [
          "Know where you genuinely stand against category norms, not just \"best practice\" guesses",
          "Prioritize fixes using real data instead of guesswork",
          "Catch blind spots like missing localization or a stale update history",
        ],
        howToUse: [
          "Scan each card for where you land versus the category average",
          "Treat any below-average card as your next thing to fix",
          "Remember freshness is inverted — fewer days since your last update scores better",
        ],
        goodToKnow: [
          "Falls back to showing just your own stats when no category benchmark data exists yet",
          "Requires the Basic plan or above",
        ],
      },
    ],
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: MagnifyingGlassIcon,
    topics: [
      {
        id: "keywords-research",
        label: "Research",
        icon: MagnifyingGlassIcon,
        description:
          "Research is where you build and maintain the list of keywords your app should be found for. It's for figuring out what to target and keeping an eye on how you rank for it.",
        benefits: [
          "Build a keyword list grounded in real volume and difficulty data instead of intuition",
          "Focus effort on keywords you can realistically rank for, instead of chasing impossible ones",
          "See what keywords are working for your competitors so you're not starting from zero",
          "Track your actual rank over time for every keyword you've decided matters",
        ],
        howToUse: [
          "Add keywords directly, or pull them from your own or a competitor's listing, or from AI suggestions",
          "Keep a competitor set so their keywords keep feeding fresh suggestions",
          "Star and filter down to your highest-priority keywords so the table stays useful",
          "Use Live Search when you want to sanity-check how a term actually performs in the store today",
        ],
        goodToKnow: [
          "Relevancy, Opportunity, and AI Suggestions require Pro+; translating foreign-language keywords also requires Pro+",
          "Adding keywords is subject to your workspace's tracked-app and keyword limits",
        ],
      },
      {
        id: "keywords-combinations",
        label: "Combinations",
        icon: AdjustmentsHorizontalIcon,
        minPlan: "pro_plus",
        description:
          "Combinations helps you find long-tail keyword phrases you'd never think to type yourself. It's for expanding a small list of seed ideas into many realistic, rankable variants fast.",
        benefits: [
          "Discover phrasing variations of your core keywords you wouldn't have brainstormed manually",
          "Find easier-to-rank long-tail alternatives to highly competitive head terms",
          "Grow your keyword footprint quickly from just a handful of starting ideas",
        ],
        howToUse: [
          "Drop in a seed term, or reuse one you're already tracking in Research",
          "Scan the generated combinations for the best mix of volume and low difficulty",
          "Bulk-add the strongest ones straight into Research so they get ongoing tracking",
        ],
        goodToKnow: [
          "Combination groups are saved locally in your browser per app, not synced across devices",
          "Requires Pro+",
        ],
      },
      {
        id: "keywords-performance",
        label: "Performance",
        icon: ArrowTrendingUpIcon,
        minPlan: "basic",
        description:
          "Performance tells you whether your keyword strategy is actually working. It's for tracking outcomes over time, not just the keyword list itself.",
        benefits: [
          "Know whether your visibility is genuinely improving, not just which keywords you're targeting",
          "Catch a keyword that's losing ground early, before it becomes a bigger problem",
          "See whether a dip is specific to you or affecting the whole category, by comparing against competitors",
        ],
        howToUse: [
          "Watch the Visibility Score trend as your single \"is this working\" signal",
          "Drill into a keyword's Volume or Rank history the moment something looks off",
          "Add competitors to the chart to put your trend in context",
        ],
        goodToKnow: ["Requires the Basic plan or above; keyword translation also requires Basic"],
      },
      {
        id: "keywords-ranked",
        label: "Ranked",
        icon: ListBulletIcon,
        minPlan: "pro_plus",
        description:
          "Ranked Keywords shows what you're already ranking for organically, without lifting a finger. It's for discovering hidden strengths in your current listing you didn't know you had.",
        benefits: [
          "Find keywords you're already ranking for that you never deliberately targeted",
          "Uncover strengths in your current copy worth reinforcing rather than rewriting",
          "Get a fuller picture of your organic footprint beyond the keywords you manually track",
        ],
        howToUse: [
          "Scan the ranked list for high-volume terms that aren't in your tracked list yet",
          "Move the best discoveries into Research so they get proper ongoing tracking",
          "Watch the \"Ranked Over Time\" trend as an overall gauge of organic keyword health",
        ],
        goodToKnow: ["Requires Pro+"],
      },
    ],
  },
  {
    id: "reviews",
    label: "Reviews & Ratings",
    icon: StarIcon,
    topics: [
      {
        id: "reviews-ratings",
        label: "Ratings",
        icon: StarIcon,
        minPlan: "basic",
        description:
          "Ratings is for anyone who wants to move their star rating deliberately, rather than just hoping it improves. It turns a vague goal into a concrete, trackable plan.",
        benefits: [
          "Know exactly where your rating stands against your category, not just in the abstract",
          "Turn \"improve our rating\" into a specific, achievable number of reviews needed",
          "See whether outreach or product fixes are actually moving the needle over time",
        ],
        howToUse: [
          "Check Current Rating and the Category comparison whenever you're reviewing app health",
          "Use \"Assess your app\" to convert a target rating into a concrete weekly review goal",
          "Watch Ratings Gained to confirm your outreach is paying off",
        ],
        goodToKnow: [
          "iOS doesn't expose a per-star breakdown from Apple — only the average and total are shown",
          "Requires the Basic plan or above",
        ],
      },
      {
        id: "reviews-reviews",
        label: "Reviews",
        icon: ChatBubbleLeftEllipsisIcon,
        minPlan: "basic",
        description:
          "Reviews is for listening to your users at scale. It's for catching recurring complaints and sentiment shifts before they show up as a rating problem.",
        benefits: [
          "Surface recurring complaints early, before they drag your rating down",
          "Understand sentiment trends over time, not just a single average number",
          "Confirm whether a recent update actually helped or hurt how users feel",
        ],
        howToUse: [
          "Read through recent reviews looking for recurring themes worth acting on",
          "Use the Growth table to see whether review volume and sentiment are trending up or down",
          "Cross-check any spike or dip against Timeline's update history to find the likely cause",
        ],
        goodToKnow: ["Requires the Basic plan or above"],
      },
    ],
  },
];

export const DEFAULT_LEARN_TOPIC_ID = LEARN_GROUPS[0].topics[0].id;

export function findLearnTopic(topicId: string): { group: LearnGroup; topic: LearnTopic } | undefined {
  for (const group of LEARN_GROUPS) {
    const topic = group.topics.find((t) => t.id === topicId);
    if (topic) return { group, topic };
  }
  return undefined;
}
