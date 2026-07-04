import { redirect } from "next/navigation";
import VerifyEmailPage from "@/features/auth/VerifyEmailPage";

type PageProps = { searchParams: Promise<{ email?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { email } = await searchParams;
  if (!email) redirect("/signup");

  return <VerifyEmailPage email={email} />;
}
