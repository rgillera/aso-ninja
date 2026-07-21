import RegistrationPage from "@/features/auth/RegistrationPage";

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <RegistrationPage next={next?.startsWith("/") ? next : undefined} />;
}
