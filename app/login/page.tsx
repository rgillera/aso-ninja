import type { Metadata } from "next";
import LoginPage from "@/features/auth/LoginPage";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to AppASO to track your App Store and Google Play keyword rankings.",
  alternates: { canonical: "/login" },
};

type PageProps = { searchParams: Promise<{ next?: string; deleted?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { next, deleted } = await searchParams;
  return <LoginPage next={next?.startsWith("/") ? next : undefined} accountDeleted={deleted === "1"} />;
}
