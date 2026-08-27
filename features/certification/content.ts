// Curriculum for the ASO Certification "Learn" course, basic through advanced.
// Self-contained on purpose: this is general ASO knowledge for the exam,
// not a tour of aso.ninja's own tools (see features/learn for that).

export type CertificationLevel = "basic" | "intermediate" | "advanced";

export const LEVEL_LABEL: Record<CertificationLevel, string> = {
  basic: "Basic",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type CertificationModule = {
  id: string;
  level: CertificationLevel;
  title: string;
  summary: string;
  keyPoints: string[];
  /** A short, concrete scenario that grounds the key points in a realistic situation. */
  example: string;
  /** Pitfalls people actually fall into on this topic, phrased as things to avoid. */
  commonMistakes: string[];
  takeaway: string;
  /** A single self-check question, revealed on demand, for active recall before moving on. */
  checkYourself: { question: string; answer: string };
};

export const CERTIFICATION_MODULES: CertificationModule[] = [
  // ---------------------------------------------------------------- Basic
  {
    id: "what-is-aso",
    level: "basic",
    title: "What Is ASO?",
    summary:
      "App Store Optimization (ASO) is the practice of improving an app's visibility and conversion rate inside app store search and browse surfaces, so more of the right people find it and install it.",
    keyPoints: [
      "ASO has two halves: visibility (do people find the app?) and conversion (do they install it once they see it?)",
      "The two main stores, Apple App Store and Google Play, each have their own ranking systems, but both weigh keyword relevance, engagement, and metadata quality",
      "ASO is ongoing, not a one-time setup: rankings shift as competitors update, algorithms change, and user behavior evolves",
      "It complements paid user acquisition rather than replacing it, since a stronger store listing makes every paid click convert better too",
    ],
    example:
      "A team obsesses over keyword rankings and watches their ASO Score climb, but the store listing's screenshots haven't changed in two years and installs are flat. Fixing visibility without touching conversion, or vice versa, only ever solves half the problem.",
    commonMistakes: [
      "Treating ASO as only \"keyword stuffing\", when conversion assets like the icon, screenshots, and description matter just as much",
      "Doing one big ASO push at launch and then never touching it again",
      "Assuming ASO and paid acquisition are separate concerns that don't affect each other",
    ],
    takeaway: "ASO is the compounding, largely free channel that makes every other acquisition channel more efficient.",
    checkYourself: {
      question: "An app ranks #1 for its top keyword but has a mediocre conversion rate. Which half of ASO does that point to as the bottleneck?",
      answer: "Conversion. Ranking well means visibility is working; the store listing itself, like the icon, screenshots, and description, isn't converting the traffic it's already getting.",
    },
  },
  {
    id: "ranking-factors",
    level: "basic",
    title: "App Store Ranking Factors",
    summary:
      "Both stores rank apps for a search term using a mix of textual relevance and behavioral signals, not keyword presence alone.",
    keyPoints: [
      "Textual relevance: how closely the app's indexed metadata matches the search term (title, subtitle/short description carry the most weight)",
      "Engagement signals: install rate, retention, and uninstall rate after installing from that keyword",
      "Ratings and review velocity: a healthy, improving rating is a consistent positive signal on both stores",
      "Freshness: regular, meaningful updates are treated as a sign of an actively maintained app",
      "Keyword stuffing without genuine relevance and engagement does not work; both stores penalize it over time",
    ],
    example:
      "Two competing apps both use the exact same keyword in their title. App A has strong retention and few uninstalls from that keyword; App B gets plenty of installs from it but users churn within a day. Over time, App A tends to pull ahead in rank for that term, even with metadata that looks identical on paper.",
    commonMistakes: [
      "Assuming a keyword in the metadata guarantees rank, regardless of how users behave after installing from it",
      "Chasing freshness with cosmetic updates instead of ones users actually notice",
      "Treating uninstall rate as only a churn metric, not also a ranking signal",
    ],
    takeaway: "Ranking is relevance multiplied by behavior. Great metadata with poor engagement still falls in rank.",
    checkYourself: {
      question: "Why can two apps with near-identical keyword metadata end up at different ranks for the same term?",
      answer: "Because ranking also weighs behavioral signals, like retention and uninstall rate, not metadata relevance alone.",
    },
  },
  {
    id: "keyword-research-basics",
    level: "basic",
    title: "Keyword Research Fundamentals",
    summary:
      "Keyword research is choosing which search terms to target based on how many people search them and how realistic it is to rank for them.",
    keyPoints: [
      "Volume tells you how often a term is searched; difficulty tells you how competitive it is to rank for",
      "Aim for a mix: a few competitive head terms, and a larger set of realistic long-tail terms you can actually win",
      "Good seed sources: your own app's core features, competitor listings, and category-relevant search suggestions",
      "A keyword only counts if it is genuinely relevant to what the app does; irrelevant traffic converts poorly and drags down engagement signals",
    ],
    example:
      "A meditation app could chase \"meditation\", huge volume, brutal competition, or target \"meditation for anxiety before bed\", far lower volume but realistically winnable, and more likely to convert someone who's actually looking for exactly that.",
    commonMistakes: [
      "Only researching high-volume head terms and ignoring realistic long-tail opportunities",
      "Adding keywords that are popular but unrelated to what the app actually does",
      "Treating keyword research as a one-time task instead of revisiting it as the app evolves",
    ],
    takeaway: "Chase keywords you can realistically rank for and that convert, not just the highest-volume terms.",
    checkYourself: {
      question: "Between a high-volume, high-difficulty term and a clearly relevant, lower-volume, low-difficulty term, which is usually the safer first target for a new app?",
      answer: "The lower-volume, low-difficulty long-tail term. It's realistically winnable and still brings relevant traffic, unlike a head term the app has little chance of ranking for yet.",
    },
  },
  {
    id: "titles-subtitles",
    level: "basic",
    title: "Writing Titles & Subtitles",
    summary:
      "The app name/title and subtitle (iOS) or short description (Android) are the highest-leverage fields in the entire listing for both ranking and first impressions.",
    keyPoints: [
      "iOS: App Name (30 characters) is weighted most heavily, followed by the Subtitle (30 characters)",
      "Android: the app title (30 characters) and Short Description (80 characters) both carry ranking weight",
      "Lead with the brand name, then a clear, keyword-rich descriptor of what the app does. Avoid vague taglines here",
      "Every character in these fields is scarce; don't waste space on words that don't help search or clarity",
    ],
    example:
      "A budgeting app called \"Finch\" might use the subtitle \"Budget, Save & Track Spending\" rather than a vague tagline like \"Your Money, Simplified\". The first is clear and keyword-rich; the second reads nicely but does no work for search.",
    commonMistakes: [
      "Spending all 30 characters on a clever tagline instead of clear, keyword-rich copy",
      "Repeating the same word across the title and subtitle instead of covering two different terms",
      "Leaving the subtitle as generic boilerplate instead of treating it as prime ranking real estate",
    ],
    takeaway: "Title and subtitle/short description are where keyword strategy and first-impression clarity meet. Get these right first.",
    checkYourself: {
      question: "An app's subtitle reads \"The Best App Ever\". What's the main problem with this from an ASO standpoint?",
      answer: "It wastes scarce, heavily-weighted character space on a vague claim instead of clear, keyword-rich copy that could help both search ranking and comprehension.",
    },
  },

  // ------------------------------------------------------------ Intermediate
  {
    id: "metadata-optimization",
    level: "intermediate",
    title: "Metadata Optimization",
    summary:
      "Beyond the title, the long description, keyword field (iOS), and category selection round out how discoverable and understandable a listing is.",
    keyPoints: [
      "iOS's 100-character Keywords field is not shown to users but is indexed for search: pack it with unrepeated, comma-separated terms, no spaces after commas",
      "Android's long description is indexed for search, so relevant terms should appear naturally within it, not just crammed at the top",
      "Category choice affects both browse discoverability and who you're benchmarked against; pick the category your realistic competitors are in",
      "Don't repeat words already used in the title/subtitle inside the keyword field, that space is wasted; use it for new terms",
    ],
    example:
      "An app's title and subtitle already say \"invoice\" and \"billing\". Rather than repeating those words in the iOS Keywords field, a sharper move fills it with new, unrepeated terms like \"receipt\", \"estimate\", \"freelance\", and \"client\", each one expanding coverage instead of duplicating it.",
    commonMistakes: [
      "Repeating title/subtitle words in the Keywords field instead of using it for new terms",
      "Writing a long description with no relevant keywords anywhere in it, missing indexed real estate on Google Play",
      "Picking a category for lower competition rather than where the app's real competitors actually are",
    ],
    takeaway: "Every indexed field is separate keyword real estate. Never duplicate a term across fields when a new one could go there instead.",
    checkYourself: {
      question: "Why is repeating a word from the Title inside iOS's Keywords field usually a wasted opportunity?",
      answer: "The Title is already indexed for that word, so repeating it there adds no coverage; it just uses up space that could index an entirely new term instead.",
    },
  },
  {
    id: "visuals-cro",
    level: "intermediate",
    title: "Visual Assets & Conversion Rate Optimization",
    summary:
      "Icon, screenshots, and preview video are what turn a search impression into an install, this is the conversion half of ASO.",
    keyPoints: [
      "The icon is the single most-seen asset; it must be legible and recognizable at a tiny size, not just attractive at full size",
      "The first 2-3 screenshots do most of the work, since many users don't scroll further, so lead with the strongest value proposition",
      "Captions/callouts on screenshots often lift conversion more than the screenshots' visuals alone",
      "A/B test one variable at a time (e.g. icon vs icon) so a conversion change can be attributed to a specific cause",
    ],
    example:
      "An icon redesign looks stunning full-size in a design review, rich gradients, fine detail, but at the thumbnail size it's actually seen in search results, it collapses into an indistinct blur. A simpler, bolder icon that reads clearly at 40 pixels would likely convert better despite looking \"less impressive\" on a large monitor.",
    commonMistakes: [
      "Judging visuals at full design-review size instead of the tiny size they're actually seen at in the store",
      "Changing multiple visual elements in the same test, making it impossible to know what actually moved the number",
      "Burying the strongest screenshot toward the end of the set instead of leading with it",
    ],
    takeaway: "Visibility gets someone to the listing; visuals decide whether they install. Both are required, neither is optional.",
    checkYourself: {
      question: "A screenshot test lifts installs but hurts day-7 retention among the new users. What should that combination prompt?",
      answer: "An investigation into whether the winning creative is attracting a less well-matched audience, since a conversion win paired with a retention drop can mean the creative is over-promising.",
    },
  },
  {
    id: "localization",
    level: "intermediate",
    title: "Localization",
    summary:
      "Translating and culturally adapting a listing for other locales is one of the highest-ROI ASO investments, since it multiplies addressable search volume.",
    keyPoints: [
      "Localization means more than translation: screenshots, cultural references, and even color choices may need to adapt per locale",
      "Both stores let you localize metadata per locale/region independently, each with its own indexed keywords",
      "Prioritize locales by a mix of market size, existing organic traffic from that region, and localization cost",
      "A literal machine translation of keywords often misses how people actually search in that language; validate with local search data where possible",
    ],
    example:
      "A fitness app translates its keyword list into French word-for-word, but French users searching that category commonly type a more casual, colloquial phrase the literal translation never surfaces. Cross-checking against real local search data catches this in a way translation accuracy alone can't.",
    commonMistakes: [
      "Treating localization as translation only, leaving screenshots and cultural references untouched",
      "Trusting machine translation for keywords without validating against real local search behavior",
      "Prioritizing locales purely by population size, ignoring existing organic traffic or localization cost",
    ],
    takeaway: "Each additional well-localized locale is close to a second, independent keyword footprint for the same app.",
    checkYourself: {
      question: "A locale is already generating meaningful organic installs even though the app has never been localized there. What does that suggest?",
      answer: "There's likely unmet demand in that region that formal localization could capture even more effectively, since organic traction with zero investment is a strong early signal.",
    },
  },
  {
    id: "ratings-reviews",
    level: "intermediate",
    title: "Ratings & Reviews Management",
    summary:
      "Star rating and review content function as both a ranking signal and a conversion signal, and are the one part of the listing users don't fully trust the developer to have written.",
    keyPoints: [
      "Prompt for a rating after a genuine positive moment in the app (e.g. after a task succeeds), not on first open",
      "Responding to reviews, especially negative ones, can recover users and signals an actively supported app to future readers",
      "Review content is also indexed for search relevance on some stores, so recurring language in reviews reinforces (or hurts) keyword relevance",
      "A declining rating trend is often a leading indicator of a product or stability issue, not just a marketing problem",
    ],
    example:
      "An app prompts for a rating the instant a task succeeds, like finishing a workout or hitting a savings goal, rather than on first open when the user hasn't experienced any value yet. Timing alone can be the difference between a 3-star and a 5-star response.",
    commonMistakes: [
      "Prompting for a rating on first open, before the user has experienced any real value",
      "Replying to every negative review with the same generic, templated response",
      "Waiting for the star average to drop before investigating a rising trend of one specific complaint in the review text",
    ],
    takeaway: "Treat ratings and reviews as a two-way channel: they influence new users, and they tell you what existing users actually think.",
    checkYourself: {
      question: "Reviews increasingly mention a specific bug, but the star average hasn't dropped yet. What should this prompt?",
      answer: "Investigating and fixing the bug proactively. Review text often surfaces an emerging problem before it has fully dragged the average rating down.",
    },
  },

  // ---------------------------------------------------------------- Advanced
  {
    id: "ab-testing",
    level: "advanced",
    title: "A/B Testing & Experimentation",
    summary:
      "Structured experimentation, usually via each store's native testing tools or a third-party pre-launch test, replaces guessing about creative and copy with evidence.",
    keyPoints: [
      "Test one element at a time (icon, first screenshot, title) to isolate what actually drove the change in conversion",
      "Run tests long enough to reach statistical confidence; stopping early on a promising-looking result is a common mistake",
      "A test that lifts conversion for one traffic source (e.g. paid) doesn't guarantee it lifts organic browse conversion the same way; segment where you can",
      "Document what was tested and the result, win or lose. A losing test is still information that prevents re-testing the same idea",
    ],
    example:
      "A new icon shows a lift after just two days and 150 sessions. It's tempting to call it a winner immediately, but with that little data the \"lift\" could easily be noise. Waiting for enough traffic to reach real statistical confidence is what separates a reliable result from a lucky streak.",
    commonMistakes: [
      "Ending a test the moment it looks promising instead of waiting for statistical confidence",
      "Changing more than one element at once, like the icon and screenshots together, so the result can't be attributed to either",
      "Only recording the tests that won, forgetting the losers and re-testing the same failed idea later",
    ],
    takeaway: "Experimentation turns ASO from opinion-driven to evidence-driven. The biggest wins are rarely the first guess.",
    checkYourself: {
      question: "A creative lifts paid conversion but shows no change in organic conversion. Does that mean the test was run incorrectly?",
      answer: "No. Paid and organic users often arrive with different context and intent, so a lift in one traffic source doesn't guarantee it transfers to the other.",
    },
  },
  {
    id: "competitive-benchmarking",
    level: "advanced",
    title: "Competitive Analysis & Benchmarking",
    summary:
      "Understanding what ranks against you, and why, turns ASO from working in a vacuum into working against a real, moving target.",
    keyPoints: [
      "Track direct competitors' keyword coverage to find terms they rank for that you don't, and vice versa",
      "Benchmark update cadence, rating trend, and review volume growth, not just current keyword rank; these predict where rank is heading",
      "A competitor's screenshot or messaging change is a signal worth investigating, even without seeing their internal test data",
      "Category averages matter less than your closest 3-5 real competitors; a generic benchmark can hide the comparison that actually matters",
    ],
    example:
      "A team benchmarks only against the broad category average and looks fine. But their three closest actual competitors, the apps users genuinely compare them to, have all been quietly climbing for months. The category average was hiding exactly the comparison that mattered.",
    commonMistakes: [
      "Relying only on a broad category average instead of the 3-5 apps you're actually competing with",
      "Tracking a competitor's current rank but never their trend, like update cadence or rating trajectory",
      "Dismissing a competitor's messaging change as irrelevant just because their internal test data isn't visible",
    ],
    takeaway: "Rank is relative. Knowing what the competition is doing (and changing) is what makes a benchmark actionable instead of vanity data.",
    checkYourself: {
      question: "Your app looks strong against the category average but weak against your closest three competitors. Which comparison should you trust more?",
      answer: "The direct-competitor comparison. It reflects the actual competitive set that matters for your app's audience and positioning, which a broad average can mask.",
    },
  },
  {
    id: "analytics-attribution",
    level: "advanced",
    title: "ASO Analytics & Attribution",
    summary:
      "Connecting keyword and creative changes to downstream outcomes, installs, retention, revenue, is what separates ASO that looks good from ASO that works.",
    keyPoints: [
      "Impressions to product page views to installs is the core store funnel; a drop at any stage points to a different fix (visibility vs. creative vs. copy)",
      "Organic and paid traffic should be viewed together where possible, since paid campaigns can lift organic rank through increased overall velocity",
      "Post-install metrics (retention, revenue per install) matter as much as the install itself; a keyword that drives installs but poor-fit users can hurt long-term rank",
      "Store-provided analytics show what happened; they rarely show why. Pair them with your own experiment log to build a causal picture over time",
    ],
    example:
      "Installs from a keyword climb steadily, so the team declares it a win. But revenue per install and 30-day retention from that same keyword are both quietly below average, meaning the volume is real but the audience quality isn't matching it, a gap install count alone would never surface.",
    commonMistakes: [
      "Judging success by install count alone, without checking retention or revenue per install",
      "Crediting a rank improvement to the most recent change without checking whether it's really just a category-wide seasonal shift",
      "Treating store analytics dashboards as a full explanation of why something happened, rather than what happened",
    ],
    takeaway: "Installs are a milestone, not the finish line. The best ASO programs track quality of installs, not just quantity.",
    checkYourself: {
      question: "A drop occurs specifically between product page views and installs, while impressions and page views themselves stay stable. Where should you look first?",
      answer: "The conversion-facing elements of the listing, like screenshots, description, and reviews, since the earlier funnel stages holding steady narrows the problem to what happens after the page is already being viewed.",
    },
  },
  {
    id: "ongoing-strategy",
    level: "advanced",
    title: "Building an Ongoing ASO Strategy",
    summary:
      "Mature ASO is a standing process, a regular cadence of research, testing, and review, rather than a launch checklist that's done once.",
    keyPoints: [
      "Set a recurring cadence: re-check keyword rankings and competitor moves on a schedule, don't wait for a metric to visibly drop",
      "Prioritize the next change using expected impact versus effort, the same way any other roadmap is prioritized",
      "Coordinate ASO changes with app updates, seasonal moments, and marketing campaigns instead of shipping them in isolation",
      "Revisit keyword strategy after every major feature launch; new capabilities often open up entirely new, relevant search terms",
    ],
    example:
      "A team ships a major new feature but doesn't touch metadata, screenshots, or keyword targeting for months afterward. Every one of those months is a missed window where the new capability could have been attracting relevant search traffic it was never given the chance to capture.",
    commonMistakes: [
      "Treating ASO as a pre-launch checklist that's \"done\" once the app ships",
      "Waiting for a metric to visibly drop before reviewing keywords or competitors, instead of keeping a standing cadence",
      "Shipping ASO changes in isolation instead of coordinating them with app updates, campaigns, and seasonal moments",
    ],
    takeaway: "The apps that stay on top treat ASO as a habit built into the release cycle, not a project that gets finished.",
    checkYourself: {
      question: "Why is \"ASO is a habit, not a project\" a useful way to think about an ongoing strategy?",
      answer: "It emphasizes that sustained, periodic attention, a recurring cadence of research, testing, and review, beats a single big push that's never revisited.",
    },
  },
];

export const CERTIFICATION_LEVEL_ORDER: CertificationLevel[] = ["basic", "intermediate", "advanced"];

export const DEFAULT_MODULE_ID = CERTIFICATION_MODULES[0].id;

export function findModule(moduleId: string): CertificationModule | undefined {
  return CERTIFICATION_MODULES.find((m) => m.id === moduleId);
}

export function modulesByLevel(level: CertificationLevel): CertificationModule[] {
  return CERTIFICATION_MODULES.filter((m) => m.level === level);
}
