"use client";

import { useState, useTransition } from "react";
import { extendGrowthStarterProAction } from "@/features/admin/actions";

// Admin → Starter Bonus: give a buyer who missed the bonus link the full
// 12 months of Pro by hand.
export function ExtendStarterProForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim();
    if (!target) return;
    if (!window.confirm(`Extend ${target}'s Growth Starter Pro to 12 months?`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await extendGrowthStarterProAction(target);
      setMessage(
        result.ok
          ? { ok: true, text: `Done. Pro now runs until ${new Date(result.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` }
          : { ok: false, text: result.error }
      );
      if (result.ok) setEmail("");
    });
  }

  return (
    <div className="mt-10 rounded-xl bg-[#141417] light:bg-white p-4 ring-1 ring-white/[0.06] light:ring-black/[0.08]">
      <h2 className="text-sm font-semibold text-white light:text-gray-900">Bought without the bonus link?</h2>
      <p className="mt-1 text-xs text-gray-500">
        Extends a Growth Starter buyer&apos;s Pro from 3 months to 12, counted from their purchase.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="buyer@example.com"
          className="min-w-56 flex-1 rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Extending…" : "Extend to 12 months"}
        </button>
      </form>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-400 light:text-emerald-700" : "text-amber-400 light:text-amber-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
