import Link from "next/link";

// Every plan-limit rejection raised by the DB triggers (keyword/app/member/
// workspace/competitor limits — see supabase/migrations/20260704000004 and
// 20260704000005) ends with "Upgrade to ...", so that phrase is a reliable
// signal this specific error is actionable via the subscription page.
export function PlanLimitMessage({ message }: { message: string }) {
  const isPlanLimit = /upgrade to/i.test(message);
  return (
    <>
      {message}
      {isPlanLimit && (
        <>
          {" "}
          <Link href="/dashboard/subscription" className="underline underline-offset-2 hover:no-underline">
            View plans
          </Link>
        </>
      )}
    </>
  );
}
