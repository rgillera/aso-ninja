import LoginPage from "@/features/auth/LoginPage";

type PageProps = { searchParams: Promise<{ next?: string; deleted?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { next, deleted } = await searchParams;
  return <LoginPage next={next?.startsWith("/") ? next : undefined} accountDeleted={deleted === "1"} />;
}
