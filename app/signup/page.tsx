import type { Metadata } from "next";
import RegistrationPage from "@/features/auth/RegistrationPage";

export const metadata: Metadata = {
  title: "Sign Up Free",
  description:
    "Create a free AppASO account. Research keywords, track rankings, and optimize your app's metadata for the App Store and Google Play.",
  alternates: { canonical: "/signup" },
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <RegistrationPage next={next?.startsWith("/") ? next : undefined} />;
}
