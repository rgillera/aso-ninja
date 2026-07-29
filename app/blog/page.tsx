import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";
import { getSortedBlogPosts } from "@/features/blog/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";

const description =
  "Keyword research, metadata tips, feature walkthroughs, and app growth strategies to help indie developers and small teams get more downloads.";

export const metadata: Metadata = {
  title: "Blog",
  description,
  keywords: [
    "ASO blog",
    "app store optimization guides",
    "keyword research",
    "app metadata tips",
    "app growth strategies",
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog | AppASO",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | AppASO",
    description,
  },
};

export default async function BlogIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const posts = getSortedBlogPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "AppASO Blog",
    description,
    url: `${siteUrl}/blog`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      url: `${siteUrl}/blog/${post.slug}`,
    })),
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Blog</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Guides to growing your{" "}
              <span className="text-indigo-400">app</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400">
              Keyword research, metadata tips, feature walkthroughs, and app growth strategies to help
              indie developers and small teams get more downloads.
            </p>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="space-y-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl bg-gray-800/50 p-8 ring-1 ring-white/10 transition-colors hover:bg-gray-800"
                >
                  <p className="text-sm font-semibold text-indigo-400">{post.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{post.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{post.excerpt}</p>
                  <p className="mt-4 text-sm text-gray-500">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    &middot; {post.readTime}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
