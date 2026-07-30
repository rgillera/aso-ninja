export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "cta"; heading: string; body: string; label: string; href: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  keywords: string[];
  content: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "appaso-vs-apptweak-mobileaction-appradar-appfollow-sensor-tower-astro",
    title:
      "AppASO vs AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower & Astro: Which ASO Tool Fits Your Team?",
    excerpt:
      "A sourced, numbers-based comparison of AppASO against AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower, and Astro — real pricing, real limits, and where each tool actually wins.",
    date: "2026-07-29",
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
        text: "App Store Optimization has no shortage of tooling, and most of it is genuinely good. AppTweak, MobileAction, AppRadar, AppFollow, and Sensor Tower are established platforms with real data behind them, Astro has built a loyal following among solo iOS developers, and each has a real strength worth acknowledging. But most of them are priced and packaged for agencies and larger marketing teams. Below is what each one actually costs and includes as of mid-2026, and how that stacks up against AppASO for an indie developer or small team running ASO on both iOS and Android.",
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
            "€83/mo (Essential)",
            "500 keywords, up to 3,000 on the €499/mo Scale plan",
            "Agencies & enterprise marketing teams",
          ],
          [
            "MobileAction",
            "ASO Intelligence + Apple Search Ads tooling",
            "$69/mo (ASO Basic)",
            "Tiered — jumps to $239/mo for ASO Pro",
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
            "iOS & Android ASO workspace for indie teams",
            "Free (20 keywords) / $12/mo unlimited",
            "Unlimited from the Basic plan, both platforms",
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
        text: "AppTweak's real strength is depth: the Essential plan (€83/mo) tracks 500 keywords with 6 months of historical data, and it scales up through Grow (€249/mo, 1,500 keywords, 12 months) to Scale (€499/mo, 3,000 keywords, 24 months). That's genuinely useful market intelligence if you're running ASO across a large portfolio and want years of trend data to lean on. It's also a much bigger commitment than most solo developers or small teams need — AppASO's Basic plan tracks unlimited keywords across unlimited apps for $12/mo, a fraction of AppTweak's cheapest tier, though without AppTweak's multi-year historical archive.",
      },
      {
        type: "heading",
        text: "MobileAction",
      },
      {
        type: "paragraph",
        text: "MobileAction's ASO Intelligence plans start at $69/mo (Basic) and jump to $239/mo (Pro), backed by a genuinely large dataset — reportedly 90M+ ad creatives, 6M+ keywords, and 5M+ tracked apps — plus Apple Search Ads campaign management bundled in. That combination is a real advantage if you're running ASO and paid UA together. If you only need keyword tracking and metadata tooling, AppASO's Pro plan ($80.40/mo) still undercuts MobileAction's Pro tier while adding AI keyword suggestions, competitor tracking, and metadata benchmarking — you just won't get MobileAction's Apple Search Ads intelligence layered in.",
      },
      {
        type: "heading",
        text: "AppRadar",
      },
      {
        type: "paragraph",
        text: "AppRadar starts at €58/mo (Essentials) and scales to €141/mo (Growth) and €250/mo (Scale), with a real edge in automation: GPT-4-powered AI review replies and the ability to push metadata updates across every storefront at once, backed by a 30M+ keyword database. That bulk multi-country publishing workflow is something AppASO doesn't offer. But for a team managing one or two apps rather than a multi-market portfolio, AppASO's Basic plan ($12/mo) covers unlimited keyword tracking for a fraction of even AppRadar's entry tier.",
      },
      {
        type: "heading",
        text: "AppFollow",
      },
      {
        type: "paragraph",
        text: "AppFollow's free plan tracks 20 keywords across 2 apps and 2 countries with 20 review replies a month — close to AppASO's free plan on keyword count, though AppASO's free plan covers metadata optimization too. Where AppFollow genuinely pulls ahead is review management: sentiment analysis, automated triage, and direct-reply tooling that's more mature than what most ASO-first tools offer. Its Premium plans start at $99/mo, and a real ASO package (beyond the free 20 keywords) starts at 200 tracked keywords. If reviews are your primary pain point, AppFollow specializes there in a way AppASO doesn't yet match; if keyword tracking and metadata are the priority, AppASO's unlimited tracking from $12/mo is the cheaper way to get there.",
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
        text: "Astro is the closest thing to AppASO on price: a flat ~$99/year (about $9/month) for unlimited keywords across unlimited apps, no per-keyword or per-app fees. It's a genuinely well-built, indie-friendly tool — and its real limitation is scope. Astro is a native Mac app built specifically for Apple's App Store; there's no Google Play tracking, no Android support, and no built-in metadata optimization workspace or competitor keyword discovery. If you only ship on iOS and want the cheapest possible flat-fee keyword tracker, Astro is worth a serious look. If you're on both iOS and Android — or want keyword research, metadata tooling, and competitor tracking in the same workspace — that's where AppASO's $12/mo Basic plan picks up where Astro's scope ends.",
      },
      {
        type: "heading",
        text: "Where AppASO stands apart",
      },
      {
        type: "bullets",
        items: [
          "Unlimited keyword tracking from $12/mo (Basic plan) — the lowest all-in entry price on this list besides Astro, and unlike Astro, it covers Android as well as iOS",
          "A genuinely free plan to start on — 20 tracked keywords and metadata optimization across unlimited apps, no credit card required",
          "One workspace for keyword research, metadata optimization, competitor tracking, and reviews, instead of paying separately for tools that each specialize in one slice of that",
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
        type: "cta",
        heading: "Try AppASO free",
        body: "Track 20 keywords and optimize your metadata for free, or unlock unlimited keyword tracking from $12/mo. No credit card required.",
        label: "Create free account",
        href: "/signup",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getSortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}
