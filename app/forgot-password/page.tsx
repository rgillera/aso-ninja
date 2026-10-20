import type { Metadata } from "next";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordPage />;
}
