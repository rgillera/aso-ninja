"use client";

import { useMemo, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import type { ReviewItem } from "./types";

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {rating}
      <StarIcon className="size-3.5 text-amber-400" />
    </span>
  );
}

type Props = { reviews: ReviewItem[] };

export function ReviewsTable({ reviews }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => reviews.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [reviews, page]
  );

  return (
    <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 px-5 py-3 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Show reviews table
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/[0.07]">
          {reviews.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-gray-600">No reviews in this date range.</p>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 w-20">Rating</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Review</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 w-40">Author</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 w-24">Version</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 w-28">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 align-top text-sm text-white"><StarRating rating={r.rating} /></td>
                      <td className="px-5 py-3 align-top max-w-md">
                        {r.title && <p className="text-sm font-medium text-gray-200">{r.title}</p>}
                        {r.body && <p className="mt-0.5 text-xs text-gray-500 line-clamp-3">{r.body}</p>}
                        {r.replyBody && (
                          <p className="mt-1.5 rounded bg-[#0d0f14] px-2 py-1 text-xs text-gray-500">
                            <span className="text-gray-400 font-medium">Developer reply: </span>{r.replyBody}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-sm text-gray-400">{r.author ?? "—"}</td>
                      <td className="px-5 py-3 align-top text-xs text-gray-500">{r.version ?? "—"}</td>
                      <td className="px-5 py-3 align-top text-xs text-gray-500 whitespace-nowrap">{formatDate(r.reviewedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pageCount > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07]">
                  <p className="text-xs text-gray-600">
                    Page {page + 1} of {pageCount} &middot; {reviews.length.toLocaleString()} reviews
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(0)} disabled={page === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500">
                      <ChevronDoubleLeftIcon className="size-4" />
                    </button>
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500">
                      <ChevronLeftIcon className="size-4" />
                    </button>
                    <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500">
                      <ChevronRightIcon className="size-4" />
                    </button>
                    <button onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500">
                      <ChevronDoubleRightIcon className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
