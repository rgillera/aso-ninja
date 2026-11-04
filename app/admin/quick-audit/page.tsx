import AdminQuickAuditPage from "@/features/admin/AdminQuickAuditPage";
import { listQuickAuditsAction } from "@/features/admin/actions";

// The audit action runs from this page and makes a few dozen live store
// requests (searches, autocomplete walks, localized lookups).
export const maxDuration = 300;

export default async function Page() {
  const history = await listQuickAuditsAction();
  return <AdminQuickAuditPage initialHistory={history} />;
}
