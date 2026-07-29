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
  content: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "appaso-vs-apptweak-mobileaction-appradar-appfollow-sensor-tower-astro",
    title:
      "AppASO vs AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower & Astro: Which ASO Tool Fits Your Team?",
    excerpt:
      "A side-by-side look at how AppASO compares to the biggest names in App Store Optimization, and why unlimited keyword tracking and built-in long tail research make it the better fit for indie developers and small teams.",
    date: "2026-07-29",
    readTime: "9 min read",
    category: "Comparisons",
    content: [
      {
        type: "paragraph",
        text: "App Store Optimization has no shortage of tooling. AppTweak, MobileAction, AppRadar, AppFollow, Sensor Tower, and Astro have all built real platforms, each with its own strengths, and each aimed primarily at agencies and larger marketing teams with the budget and headcount to match. If you're an indie developer or a small app team, though, the calculus is different: you need real keyword data and metadata tooling without a tracking cap forcing you to ration which keywords matter, and without a price tag built for a client roster instead of one or two apps. That's the gap AppASO was built to close.",
      },
      {
        type: "heading",
        text: "The quick comparison",
      },
      {
        type: "table",
        headers: ["Tool", "Known for", "Keyword tracking", "Long tail research", "Best for"],
        rows: [
          [
            "AppTweak",
            "Enterprise ASO & market intelligence suite",
            "Capped by plan tier",
            "Limited, higher-tier add-on",
            "Agencies & enterprise marketing teams",
          ],
          [
            "MobileAction",
            "App intelligence & competitor tracking",
            "Capped by plan tier",
            "Limited",
            "Agencies & app intelligence teams",
          ],
          [
            "AppRadar",
            "ASO platform with managed agency services",
            "Capped by plan tier",
            "Limited add-on",
            "Teams that want a managed-service layer",
          ],
          [
            "AppFollow",
            "Review management & ASO tracking",
            "Capped by plan tier",
            "Limited",
            "Support & review-focused teams",
          ],
          [
            "Sensor Tower",
            "Market intelligence & analytics at scale",
            "Enterprise-tier, capped",
            "Limited/enterprise add-on",
            "Large publishers & investors",
          ],
          [
            "Astro",
            "ASO & growth analytics",
            "Capped by plan tier",
            "Limited",
            "Teams wanting broader growth analytics",
          ],
          [
            "AppASO",
            "ASO workspace built for indie & small teams",
            "Unlimited, on every plan",
            "Built in as a dedicated tool",
            "Indie developers & small app teams",
          ],
        ],
      },
      {
        type: "heading",
        text: "AppTweak",
      },
      {
        type: "paragraph",
        text: "AppTweak is one of the most established names in ASO, with a broad suite covering keyword tracking, creative analytics, and market intelligence. It's a strong pick if you're running ASO across a large portfolio of apps with a dedicated team to operate it. That scale is also reflected in how the platform is priced and packaged — it's built around agency and enterprise workflows, which makes it a heavier commitment than a solo developer or small team typically needs for day-to-day keyword and metadata work.",
      },
      {
        type: "heading",
        text: "MobileAction",
      },
      {
        type: "paragraph",
        text: "MobileAction leans heavily into competitive intelligence — seeing what other apps are doing with their keywords, ads, and store listings. That's genuinely useful for competitive research, but the core workflow of tracking your own keywords and iterating on your own metadata is only part of a much larger, enterprise-oriented platform. Smaller teams often end up paying for a lot of surface area they don't touch.",
      },
      {
        type: "heading",
        text: "AppRadar",
      },
      {
        type: "paragraph",
        text: "AppRadar pairs its ASO tooling with managed agency services, which is appealing if you'd rather hand off optimization work entirely. If you want to stay hands-on with your own keyword research and metadata decisions, though, you're paying in part for a service layer you may not use, and self-serve keyword tracking still comes with the plan-based limits common across this category.",
      },
      {
        type: "heading",
        text: "AppFollow",
      },
      {
        type: "paragraph",
        text: "AppFollow's strongest suit is review and rating management — collecting, triaging, and responding to user feedback across stores. Its ASO tracking exists alongside that, but keyword research and long tail discovery are secondary to the review workflow. If reviews are your main problem, it's a solid fit; if keyword visibility and metadata iteration are the priority, it's not built around that first.",
      },
      {
        type: "heading",
        text: "Sensor Tower",
      },
      {
        type: "paragraph",
        text: "Sensor Tower is best known for market-wide intelligence — download estimates, revenue estimates, and industry benchmarking used heavily by investors and large publishers. It's less a day-to-day keyword and metadata workspace for a single app team and more a research platform, priced and packaged accordingly.",
      },
      {
        type: "heading",
        text: "Astro",
      },
      {
        type: "paragraph",
        text: "Astro covers ASO alongside broader growth and analytics tracking, which is useful if you want optimization data sitting next to wider growth metrics in one place. That breadth means keyword tracking and long tail research are one slice of a bigger tool rather than the central focus, and plan tiers still gate how many keywords you can actively track.",
      },
      {
        type: "heading",
        text: "Where AppASO stands apart",
      },
      {
        type: "bullets",
        items: [
          "Unlimited keyword tracking on every plan — no cap that forces you to ration which keywords you monitor, even as your workspace grows",
          "Long tail keyword research built in — turn a handful of seed terms into dozens of realistic, lower-competition keyword variants without a separate tool or add-on",
          "Affordable, indie-first pricing — free to start, with paid plans priced for a solo developer or small team, not an agency retainer",
          "One workspace — keyword research, metadata optimization, competitor tracking, and reviews together, instead of stitching together several subscriptions to cover the same ground",
        ],
      },
      {
        type: "heading",
        text: "Which one should you actually use?",
      },
      {
        type: "paragraph",
        text: "If you're running ASO across a large portfolio with a dedicated team, or you need market-wide competitive intelligence for investment or agency reporting, AppTweak, MobileAction, or Sensor Tower are built for that scale. If you want managed services layered on top of your ASO work, AppRadar fits. If reviews are your core problem, AppFollow is worth a look. But if you're an indie developer or small team who wants full keyword visibility — every keyword tracked, not just the top few your plan allows — plus real long tail research and metadata tooling, without paying agency prices for it, that's exactly the gap AppASO fills.",
      },
      {
        type: "cta",
        heading: "Try AppASO free",
        body: "Track unlimited keywords, research long tail opportunities, and optimize your metadata — free to start, no credit card required.",
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
