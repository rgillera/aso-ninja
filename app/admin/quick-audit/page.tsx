import AdminQuickAuditPage from "@/features/admin/AdminQuickAuditPage";

// The audit action runs from this page and makes a few dozen live store
// requests (searches, autocomplete walks, localized lookups).
export const maxDuration = 300;

export default function Page() {
  return <AdminQuickAuditPage />;
}
