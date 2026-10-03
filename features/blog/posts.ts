import { COMPARISON_POSTS } from "./comparison-posts";

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "cta"; heading: string; body: string; label: string; href: string }
  // Rendered as a visible Q&A section and emitted as FAQPage structured data.
  | { type: "faq"; items: { question: string; answer: string }[] };

export type BlogPost = {
  slug: string;
  /** On-page H1. Can be long and descriptive. */
  title: string;
  /** <title> tag, before the " | AppASO" suffix. Keep under ~50 characters so search results don't truncate it. Falls back to `title`. */
  seoTitle?: string;
  /** Card and intro summary. */
  excerpt: string;
  /** Meta description, ideally 140-160 characters. Falls back to `excerpt`. */
  metaDescription?: string;
  /** Publish date, YYYY-MM-DD. */
  date: string;
  /** Last substantive update, YYYY-MM-DD. Shown on the post and used as dateModified / sitemap lastModified. */
  updated?: string;
  readTime: string;
  category: string;
  keywords: string[];
  content: BlogBlock[];
};

// Dates are plain YYYY-MM-DD strings, which `new Date()` parses as UTC
// midnight. Formatting in UTC keeps them from rendering a day early in
// timezones west of UTC.
export function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Up to `limit` other posts, same category first, then the newest. */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(slug);
  return getSortedBlogPosts()
    .filter((p) => p.slug !== slug)
    .sort((a, b) => Number(b.category === current?.category) - Number(a.category === current?.category))
    .slice(0, limit);
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "appaso-vs-apptweak-mobileaction-appradar-appfollow-sensor-tower-astro",
    seoTitle: "AppASO vs AppTweak, MobileAction & More (2026)",
    title:
      "AppASO vs AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower & Astro: Which ASO Tool Fits Your Team?",
    excerpt:
      "A sourced, numbers-based comparison of AppASO against AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower, and Astro — real pricing, real limits, and where each tool actually wins.",
    metaDescription: "Compare AppASO with AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower and Astro: real pricing, keyword limits, and which ASO tool fits your team.",
    date: "2026-07-29",
    updated: "2026-10-03",
    readTime: "10 min read",
    category: "Comparisons",
    keywords: [
      "ASO tool comparison",
      "AppTweak alternative",
      "MobileAction alternative",
      "AppRadar alternative",
      "AppFollow alternative",
      "Sensor Tower alternative",
      "Astro alternative",
      "best ASO tool for indie developers",
      "app store optimization tools",
    ],
    content: [
      {
        type: "paragraph",
        text: "App Store Optimization has no shortage of tooling, and most of it is genuinely good. AppTweak, MobileAction, AppRadar, AppFollow, and Sensor Tower are established platforms with real data behind them, Astro has built a loyal following among solo iOS developers, and each has a real strength worth acknowledging. But most of them are priced and packaged for agencies and larger marketing teams. Below is what each one actually costs and includes (AppASO, AppTweak, and MobileAction pricing checked October 2026; other competitors as of mid-2026), and how that stacks up against AppASO for an indie developer or small team running ASO on both iOS and Android.",
      },
      {
        type: "heading",
        text: "The quick comparison",
      },
      {
        type: "table",
        headers: ["Tool", "Known for", "Starting price", "Keyword tracking", "Best for"],
        rows: [
          [
            "AppTweak",
            "Deep historical & market intelligence data",
            "$79/mo (Essential)",
            "500 keywords, up to 3,000 on the $499/mo Grow Plus plan",
            "Agencies & enterprise marketing teams",
          ],
          [
            "MobileAction",
            "ASO Intelligence + Apple Search Ads tooling",
            "$15/mo (Lite, 100 keywords)",
            "Tiered: 500 keywords on Basic ($69/mo), 1,500 on Pro ($239/mo)",
            "Agencies running ASO and paid UA together",
          ],
          [
            "AppRadar",
            "AI-driven ASO with automated review replies",
            "€58/mo (Essentials)",
            "Access to a 30M+ keyword database, scaling with plan",
            "Teams wanting AI automation & bulk publishing",
          ],
          [
            "AppFollow",
            "Review & rating management with ASO tracking",
            "Free (20 keywords) / $99/mo Premium",
            "20 free; ASO packages start at 200 keywords",
            "Review-first teams",
          ],
          [
            "Sensor Tower",
            "Investor-grade market intelligence",
            "No public pricing — sales-led, ~$25k–$40k+/yr reported",
            "Unlimited tracking is an enterprise-only add-on",
            "Large publishers & investors",
          ],
          [
            "Astro",
            "Native Mac app for iOS-only keyword tracking",
            "~$99/yr flat (~$9/mo)",
            "Unlimited keywords & apps, flat fee, iOS only",
            "Solo developers who only ship on iOS",
          ],
          [
            "AppASO",
            "iOS & Android ASO with relevancy scoring & download estimates",
            "Free (100 keywords) / $29/mo Pro ($24/mo billed yearly)",
            "100 free; unlimited from the Pro plan, both platforms",
            "Indie developers & small teams on iOS and Android, agencies, large publishers",
          ],
        ],
      },
      {
        type: "heading",
        text: "AppTweak",
      },
      {
        type: "paragraph",
        text: "AppTweak's real strength is depth: the Essential plan ($79/mo) tracks 500 keywords with 6 months of historical data and includes relevancy scoring, and it scales up through Grow ($249/mo, 1,500 keywords, 12 months, organic installs per keyword) to Grow Plus ($499/mo, 3,000 keywords, 24 months). That's genuinely useful market intelligence if you're running ASO across a large portfolio and want years of trend data to lean on. It's also a much bigger commitment than most solo developers or small teams need. AppASO's Pro plan tracks unlimited keywords across unlimited apps for $29/mo ($24/mo billed yearly), well under half of AppTweak's cheapest tier, and includes relevancy scoring and estimated downloads per keyword. What it doesn't have is AppTweak's multi-year archive: Pro keeps 6 months of history and Pro+ keeps a year.",
      },
      {
        type: "heading",
        text: "MobileAction",
      },
      {
        type: "paragraph",
        text: "MobileAction's ASO Intelligence plans start at $15/mo (Lite, 100 keywords), then $69/mo (Basic) and $239/mo (Pro, which adds organic downloads per keyword), backed by a genuinely large dataset — reportedly 90M+ ad creatives, 6M+ keywords, and 5M+ tracked apps — plus Apple Search Ads campaign management bundled in. That combination is a real advantage if you're running ASO and paid UA together. If keyword tracking and metadata tooling are the priority, AppASO's Pro plan ($29/mo, or $24/mo billed yearly) costs a fraction of MobileAction's Pro tier and includes AI keyword suggestions, competitor tracking, relevancy scoring, and estimated downloads per keyword. AppASO Pro also includes Apple Search Ads and market intelligence features, but MobileAction's ASA campaign management goes deeper if paid UA is a big part of your growth.",
      },
      {
        type: "heading",
        text: "AppRadar",
      },
      {
        type: "paragraph",
        text: "AppRadar starts at €58/mo (Essentials) and scales to €141/mo (Growth) and €250/mo (Scale), with a real edge in automation: GPT-4-powered AI review replies and the ability to push metadata updates across every storefront at once, backed by a 30M+ keyword database. That bulk multi-country publishing workflow is something AppASO doesn't offer. But for a team managing one or two apps rather than a multi-market portfolio, AppASO's free plan covers 100 tracked keywords, and Pro adds unlimited tracking for $29/mo, or $24/mo billed yearly, less than half of AppRadar's entry tier.",
      },
      {
        type: "heading",
        text: "AppFollow",
      },
      {
        type: "paragraph",
        text: "AppFollow's free plan tracks 20 keywords across 2 apps and 2 countries with 20 review replies a month — a fraction of AppASO's free plan, though AppASO's free plan covers metadata optimization too. Where AppFollow genuinely pulls ahead is review management: sentiment analysis, automated triage, and direct-reply tooling that's more mature than what most ASO-first tools offer. Its Premium plans start at $99/mo, and a real ASO package (beyond the free 20 keywords) starts at 200 tracked keywords. If reviews are your primary pain point, AppFollow specializes there in a way AppASO doesn't yet match; if keyword tracking and metadata are the priority, AppASO's unlimited tracking from $24/mo (Pro, billed yearly) is the cheaper way to get there.",
      },
      {
        type: "heading",
        text: "Sensor Tower",
      },
      {
        type: "paragraph",
        text: "Sensor Tower doesn't publish pricing — it's sold through annual contracts and sales calls, with small teams reportedly paying $25,000–$40,000 a year and enterprise deals reaching six figures. In exchange you get its real strength: investor-grade download and revenue estimates and market-wide competitive intelligence used for M&A and investment decisions — data most teams simply don't need for day-to-day ASO. Notably, even Sensor Tower gates unlimited keyword tracking behind its enterprise tier. AppASO isn't trying to compete on macro market intelligence; it's built for the much more common job of tracking your own keywords and iterating your own listing, at a self-serve price you can see before you sign up.",
      },
      {
        type: "heading",
        text: "Astro",
      },
      {
        type: "paragraph",
        text: "Astro is the closest thing to AppASO on price: a flat ~$99/year (about $9/month) for unlimited keywords across unlimited apps, no per-keyword or per-app fees. It's a genuinely well-built, indie-friendly tool — and its real limitation is scope. Astro is a native Mac app built specifically for Apple's App Store; there's no Google Play tracking, no Android support, and no built-in metadata optimization workspace or competitor keyword discovery. If you only ship on iOS and want the cheapest possible flat-fee keyword tracker, Astro is worth a serious look. If you're on both iOS and Android, or want keyword research, metadata tooling, and competitor tracking in the same workspace, AppASO picks up where Astro's scope ends: its free plan covers 100 keywords on both stores, and Pro adds unlimited tracking from $24/mo billed yearly.",
      },
      {
        type: "heading",
        text: "Where AppASO stands apart",
      },
      {
        type: "bullets",
        items: [
          "Relevancy scoring and estimated downloads per keyword included on Pro, from $24/mo billed yearly",
          "Unlimited keyword tracking on Pro, covering Android as well as iOS",
          "A genuinely free plan to start on: 100 tracked keywords, metadata optimization, and relevancy scoring for 40 keywords across unlimited apps, no credit card required",
          "One workspace for keyword research, AI keyword suggestions, metadata optimization, competitor tracking, and reviews, instead of paying separately for tools that each specialize in one slice of that",
          "An ASO certification exam included with Pro, alongside a free overview course",
          "Transparent, published self-serve pricing — no sales calls or annual contracts required just to find out what it costs, unlike Sensor Tower",
        ],
      },
      {
        type: "heading",
        text: "Which one should you actually use?",
      },
      {
        type: "paragraph",
        text: "If you need investor-grade market intelligence or you're running ASO across a large multi-app portfolio with a dedicated team, AppTweak, MobileAction, or Sensor Tower's depth of historical and competitive data is real, and you'll pay enterprise or agency prices for it. If AI-automated review replies and bulk multi-storefront publishing matter most, AppRadar fits. If reviews are your single biggest problem, AppFollow's sentiment tooling is the most mature option here. If you're a solo developer who only ships on iOS and wants the cheapest possible flat-fee keyword tracker, Astro is genuinely worth using. But if you're an indie developer or small team shipping on iOS and Android who wants unlimited keyword tracking, metadata tooling, and competitor tracking in one workspace, without an enterprise price tag, a sales call, or a Mac-only tool — that's exactly where AppASO fits.",
      },
      {
        type: "faq",
        items: [
          { question: "What is the cheapest ASO tool that covers iOS and Google Play?", answer: "AppASO has a free plan with 100 tracked keywords across unlimited iOS and Android apps, and Pro costs $29/mo, or $24/mo billed yearly, for unlimited keywords. Astro is cheaper at $9/mo billed yearly, but it only covers the App Store and runs only on a Mac." },
          { question: "Which ASO tool is best for indie developers?", answer: "It depends on your platforms and budget. Solo iOS developers on a Mac often pick Astro. Indie developers shipping on both iOS and Android, or who want relevancy scoring and downloads per keyword without enterprise pricing, are AppASO's core audience." },
          { question: "Does AppASO replace Sensor Tower?", answer: "No. Sensor Tower is built for market-wide download and revenue intelligence used in strategy and investment decisions. AppASO is built for day-to-day ASO: tracking your own keywords and improving your own listing." },
        ],
      },
      {
        type: "cta",
        heading: "Try AppASO free",
        body: "Track 100 keywords and optimize your metadata for free, or unlock unlimited keyword tracking, relevancy scoring, and download estimates from $24/mo billed yearly. No credit card required.",
        label: "Create free account",
        href: "/signup",
      },
    ],
  },
  ...COMPARISON_POSTS,
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getSortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}
