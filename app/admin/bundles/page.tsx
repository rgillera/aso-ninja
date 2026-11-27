import { notFound } from "next/navigation";
import { LinkIcon } from "@heroicons/react/24/outline";
import { createRealUserClient } from "@/libs/supabase/server";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { BundleLinkForm } from "@/features/admin/BundleLinkForm";

// Makes Stripe checkout links for the Pro and Pro+ bundles (12 months of the
// plan plus 1 month of service), to send on a sales call. Each link is new
// and lasts 24 hours.
export default async function Page() {
  // The layout already gates /admin; checked again because this page makes payment links.
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) notFound();

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <LinkIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Bundle links</h1>
            <p className="text-xs text-gray-500">
              A checkout link for 12 months of Pro or Pro+ plus 1 month of service. The buyer pays without signing up, and their account is ready by email right after. Each link lasts 24 hours.
            </p>
          </div>
        </div>

        <BundleLinkForm />
      </div>
    </div>
  );
}
