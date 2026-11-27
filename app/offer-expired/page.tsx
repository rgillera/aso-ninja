import type { Metadata } from "next";
import AuthBackdrop from "@/features/auth/AuthBackdrop";

export const metadata: Metadata = {
  title: "This link has expired",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ invalid?: string }> };

// Where a bundle link (app/buy/[token]) lands once its deadline has passed,
// or when it was copied incompletely.
export default async function Page({ searchParams }: Props) {
  const { invalid } = await searchParams;
  return (
    <div className="relative isolate min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <AuthBackdrop />
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {invalid ? "This link doesn't work" : "This link has expired"}
        </h1>
        <div className="mt-6 bg-white rounded-2xl p-8 shadow-clay-lg ring-1 ring-gray-950/[0.07] space-y-3 text-sm text-gray-700">
          <p>
            {invalid
              ? "It may have been cut off when it was copied. Try opening the full link from your email again."
              : "The offer in this link has ended."}
          </p>
          <p>
            Still interested? Reply to the email you got it in, or write to{" "}
            <a href="mailto:hello@appaso.io" className="text-indigo-600 hover:text-indigo-500 font-medium">hello@appaso.io</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
