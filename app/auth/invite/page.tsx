import type { Metadata } from "next";
import InviteLandingPage from "@/features/auth/InviteLandingPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <InviteLandingPage />;
}
