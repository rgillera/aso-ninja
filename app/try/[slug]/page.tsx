import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdLandingPage from "@/features/landing/AdLandingPage";
import { AD_LANDING_PAGES, getAdLandingPage } from "@/features/landing/ad-landing-pages";

export async function generateStaticParams() {
  return AD_LANDING_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getAdLandingPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.subhead,
    alternates: { canonical: `/try/${page.slug}` },
    // Ad traffic only; see features/landing/ad-landing-pages.ts.
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getAdLandingPage(slug);
  if (!page) notFound();
  return <AdLandingPage page={page} />;
}
