import LoginPage from "@/features/auth/LoginPage";

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <LoginPage next={next?.startsWith("/") ? next : undefined} />;
}
