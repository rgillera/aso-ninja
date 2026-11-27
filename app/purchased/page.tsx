import type { Metadata } from "next";
import AuthBackdrop from "@/features/auth/AuthBackdrop";

export const metadata: Metadata = {
  title: "Thanks for your purchase",
  robots: { index: false, follow: false },
};

// Where a bundle checkout lands after payment. The account is made by the
// Stripe webhook, so this only points the buyer at their email.
export default function Page() {
  return (
    <div className="relative isolate min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <AuthBackdrop />
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Thanks for your purchase!</h1>
        <div className="mt-6 bg-white rounded-2xl p-8 shadow-clay-lg ring-1 ring-gray-950/[0.07] space-y-3 text-sm text-gray-700">
          <p>Your AppASO plan is active. Check your email for a welcome message with how to get in.</p>
          <p>
            Already have an account?{" "}
            <a href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">Log in</a> as usual.
          </p>
          <p className="text-gray-500">
            No email within a few minutes? Check spam, or write to{" "}
            <a href="mailto:hello@appaso.io" className="text-indigo-600 hover:text-indigo-500">hello@appaso.io</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
