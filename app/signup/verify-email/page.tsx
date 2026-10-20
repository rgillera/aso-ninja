import type { Metadata } from "next";
import { redirect } from "next/navigation";
import VerifyEmailPage from "@/features/auth/VerifyEmailPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ email?: string; next?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { email, next } = await searchParams;
  if (!email) redirect("/signup");

  return <VerifyEmailPage email={email} next={next?.startsWith("/") ? next : undefined} />;
}
