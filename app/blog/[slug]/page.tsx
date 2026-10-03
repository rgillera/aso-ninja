import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";
import BlogArticle from "@/features/blog/BlogArticle";
import { BLOG_POSTS, getBlogPost, getRelatedPosts, formatPostDate, type BlogBlock } from "@/features/blog/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";

// Named author for E-E-A-T: posts are written by the founder, the same
// person introduced on /our-story.
const author = {
  name: "Rodel Gillera",
  role: "Founder, AppASO",
  photo: "/founder.jpeg",
  url: "https://www.linkedin.com/in/rodel-gillera",
};

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const description = post.metaDescription ?? post.excerpt;
  return {
    title: post.seoTitle ?? post.title,
    description,
    keywords: post.keywords,
    authors: [{ name: author.name, url: author.url }],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [author.name],
      section: post.category,
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const related = getRelatedPosts(post.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    image: `${postUrl}/opengraph-image`,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    articleSection: post.category,
    keywords: post.keywords.join(", "),
    author: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.role,
      url: `${siteUrl}/our-story`,
      sameAs: [author.url],
    },
    publisher: {
      "@type": "Organization",
      name: "AppASO",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  const faqItems = post.content.flatMap((b: BlogBlock) => (b.type === "faq" ? b.items : []));
  const faqJsonLd = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <article>
          <section className="pt-32 pb-12">
            <div className="mx-auto max-w-3xl px-6 lg:px-8">
              <Link href="/blog" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                &larr; Back to blog
              </Link>
              <p className="mt-6 text-sm font-semibold text-indigo-600 uppercase tracking-widest">
                {post.category}
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-6 flex items-center gap-3">
                <img
                  src={author.photo}
                  alt={author.name}
                  width={800}
                  height={800}
                  className="size-10 rounded-full object-cover ring-2 ring-white"
                />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    <Link href="/our-story" className="hover:text-indigo-600">
                      {author.name}
                    </Link>
                  </p>
                  <p className="text-gray-400">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                    {post.updated && post.updated !== post.date && (
                      <>
                        {" "}&middot; Updated <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
                      </>
                    )}{" "}
                    &middot; {post.readTime}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pb-16">
            <div className="mx-auto max-w-3xl px-6 lg:px-8">
              <BlogArticle content={post.content} />
            </div>
          </section>
        </article>

        {related.length > 0 && (
          <section className="pb-24 sm:pb-32">
            <div className="mx-auto max-w-3xl px-6 lg:px-8">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">Keep reading</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="block rounded-2xl bg-white p-5 shadow-clay ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-clay-lg"
                  >
                    <p className="text-xs font-semibold text-indigo-600">{r.category}</p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">{r.seoTitle ?? r.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <PortalFooter />
    </div>
  );
}
