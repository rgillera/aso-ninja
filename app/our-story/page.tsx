import type { Metadata } from "next";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "Our Story",
  alternates: {
    canonical: "/our-story",
  },
};

const founder = {
  name: "Rodel Gillera",
  role: "Founder, AppASO",
  photo: "/founder.jpeg",
  // Byline shows a LinkedIn link only once this is set.
  linkedinUrl: "https://www.linkedin.com/in/rodel-gillera",
};

type StoryImage = { src: string; alt: string; width: number; height: number };
type Block = string | { image: StoryImage } | { quote: string };

const chapters: { title: string; blocks: Block[] }[] = [
  {
    title: "Building apps nobody used",
    blocks: [
      "This journey started before the pandemic. Like many of you, I had no clear direction. I just wanted to build apps. So, I did. One after another. I spent weeks, even months, building features no one used, convinced that just publishing to the App Store would somehow make everything work out. I thought, \"If it's live, users will come.\" I was wrong.",
      "Here's the proof, check my GitHub. It all started during the lockdown 😄",
      { image: { src: "/github1.png", alt: "GitHub contribution graph showing 486 contributions in 2020", width: 1542, height: 414 } },
      "What began as a way to kill time quickly turned into an obsession. One project led to another, and before I knew it, I was hooked.",
      { image: { src: "/github2.png", alt: "GitHub contribution graph from the following year", width: 1534, height: 398 } },
      { image: { src: "/github3.png", alt: "GitHub contribution graph from a later year", width: 1546, height: 390 } },
      "Looking back, I wish someone had guided me through the process. I spent countless hours learning the hard way, making mistakes, hitting walls, and wondering why nothing was growing.",
    ],
  },
  {
    title: "Learning the business side",
    blocks: [
      "At the time, I knew very little about the business side of apps. So I committed myself to learn. Every single day, I studied. I gave myself at least two hours daily to dive into app marketing, ASO (App Store Optimization), user acquisition, retention strategies, anything I could get my hands on. Not because I wanted to start a company, but because I wanted to build better apps… and make sure my work didn't go to waste.",
      "Then something happened.",
      "A developer reached out and offered to pay me $200 for just 30 minutes of my time to help her with her app. I didn't expect that. But I agreed. I shared what I knew, and afterward, she told me how grateful she was. That moment stuck with me. Because her struggles were the same as mine.",
      { image: { src: "/idea.jpg", alt: "Illustration of a lightbulb moment", width: 540, height: 360 } },
      "That's when it hit me: it's not just me. So many indie developers and small teams go through this, trying to figure things out on their own, wasting time, energy, and motivation. We all face the same roadblocks. And I realized, if someone had just shared their journey with me back then, maybe I wouldn't have had to struggle so much.",
    ],
  },
  {
    title: "Starting ASO Ninja",
    blocks: [
      "That moment led me to create ASO Ninja, a platform where I share everything I've learned about app growth, marketing, and ASO. No fluff, no hype, just real strategies that actually work. My goal is simple: to help other indie devs, small teams, and startups avoid the painful trial and error I went through.",
      { quote: "If I can save you even one wasted year, that's a win." },
      "After that, I fully committed to this journey. I didn't want to just build apps. I wanted to understand how to make them grow. So I connected with three other passionate people who shared the same obsession. Each of them brings deep expertise in areas I once struggled with: ASO, user acquisition, monetization, and growth strategies.",
      { image: { src: "/team.png", alt: "The ASO Ninja team", width: 1104, height: 698 } },
      "Together, we combine real-world experience and hard-earned lessons to help others avoid the costly mistakes we made. If you're serious about growing your app, we've built this with you in mind because we've been exactly where you are.",
      "We're not here to sell dreams. We're here to support you with practical, proven strategies. Whether you're an indie dev, part of a small team, or just starting out, we're here to help you the best we can.",
      "Our approach is straightforward: we combine everything we've learned, our wins, our setbacks, and our proven growth tactics into one comprehensive app growth service, with tailored strategies designed to help your app grow smarter, faster, and more sustainably.",
    ],
  },
  {
    title: "Why we built AppASO",
    blocks: [
      "Running ASO for clients showed us where the real gap was: the data. Keyword rankings, relevancy scores, and download estimates were locked behind tools priced for big brands, out of reach for the indie developers we wanted to help.",
      "In June 2025 we started building our own internal ASO tool. The data was limited at first, so we focused on collecting it, tracking keywords, rankings, and search results across the App Store and Google Play.",
      "By July 2026 we had built up a large base of store data, so we turned the internal tool into AppASO.io, giving indie developers, startups, and agencies the same data without the cost of the big ASO brands.",
    ],
  },
];

const milestones: { date: string; title: string; description: string; certificate?: boolean }[] = [
  {
    date: "Before 2020",
    title: "Building apps without direction",
    description: "One app after another, plenty of features, very few users.",
  },
  {
    date: "2020",
    title: "Lockdown turns it into an obsession",
    description: "Two hours a day studying app marketing, ASO, user acquisition, and retention.",
  },
  {
    date: "May 2025",
    title: "ASO Ninja is born",
    description:
      "A team of four running done-for-you ASO for app teams, later layering in Meta Ads and Apple Search Ads to scale growth beyond organic.",
  },
  {
    date: "June 2025",
    title: "Building our internal ASO tool",
    description: "An in-house tool for our client work. The data was limited at first, so we started collecting it.",
  },
  {
    date: "Oct 2025",
    title: "AppTweak Certified",
    description: "Every ASO Ninja specialist passed the ASO with AppTweak certification exam.",
    certificate: true,
  },
  {
    date: "July 2026",
    title: "From internal tool to AppASO",
    description:
      "With a large base of App Store and Google Play data collected, we opened our internal tool to everyone as AppASO. We still take on select clients one-on-one.",
  },
];

export default async function OurStoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">Our story</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              From growing our own apps{" "}
              <span className="text-indigo-600">to building the tools we needed</span>
            </h1>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            {/* Timeline left, story right on desktop. On mobile the story
                comes first so the page reads as a narrative before the recap. */}
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
              <aside className="order-2 lg:order-1">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Milestones</h2>
                <div className="relative mt-8">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-black/[0.08]" aria-hidden="true" />
                  <div className="space-y-10">
                    {milestones.map((m) => (
                      <div key={m.date} className="relative pl-8">
                        <span className="absolute left-0 top-1.5 size-3.5 rounded-full bg-indigo-500 ring-4 ring-[#f5f6f8]" />
                        <p className="text-sm font-semibold text-indigo-600">{m.date}</p>
                        <h3 className="mt-1 text-base font-semibold text-gray-900">{m.title}</h3>
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{m.description}</p>
                        {m.certificate && (
                          <a
                            href="/apptweak-certificate.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block max-w-md overflow-hidden rounded-xl bg-white shadow-clay ring-1 ring-black/5 transition-shadow hover:shadow-clay-lg"
                          >
                            <img
                              src="/apptweak-certificate.png"
                              alt="ASO with AppTweak certificate awarded to the ASO Ninja Team, 2 Oct 2025"
                              width={1684}
                              height={1189}
                              className="h-auto w-full"
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="order-1 space-y-14 lg:order-2">
                <div className="flex items-center gap-4">
                  <img
                    src={founder.photo}
                    alt={founder.name}
                    width={800}
                    height={800}
                    className="size-16 rounded-full object-cover ring-4 ring-white shadow-clay"
                  />
                  <div>
                    <p className="text-base font-semibold text-gray-900">{founder.name}</p>
                    <p className="text-sm text-gray-600">
                      {founder.role}
                      {founder.linkedinUrl && (
                        <>
                          {" · "}
                          <a
                            href={founder.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            LinkedIn
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {chapters.map((chapter) => (
                  <div key={chapter.title}>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{chapter.title}</h2>
                    <div className="mt-4 space-y-4 text-base leading-relaxed text-gray-700 sm:text-lg">
                      {chapter.blocks.map((block, i) =>
                        typeof block === "string" ? (
                          <p key={i}>{block}</p>
                        ) : "image" in block ? (
                          <img
                            key={i}
                            src={block.image.src}
                            alt={block.image.alt}
                            width={block.image.width}
                            height={block.image.height}
                            loading="lazy"
                            className="!my-8 h-auto w-full rounded-xl bg-white shadow-clay ring-1 ring-black/5"
                          />
                        ) : (
                          <p
                            key={i}
                            className="!my-8 border-l-4 border-indigo-500 pl-5 text-xl font-semibold text-gray-900 sm:text-2xl"
                          >
                            {block.quote}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-20 text-center">
                <a
                  href="/signup"
                  className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  Create free account
                </a>
              </div>
            )}
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
