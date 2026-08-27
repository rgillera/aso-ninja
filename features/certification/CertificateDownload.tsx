"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { downloadCertificate } from "./certificate";

type Props = {
  holderName: string;
  certificateId?: string;
  issuedAt?: string;
};

export function CertificateDownload({ holderName, certificateId, issuedAt }: Props) {
  const [certName, setCertName] = useState(holderName);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const dateLabel = new Date(issuedAt ?? Date.now()).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await downloadCertificate({ name: certName, dateLabel, certificateId });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <input
        type="text"
        value={certName}
        onChange={(e) => setCertName(e.target.value)}
        placeholder="Your name"
        className="min-w-0 flex-1 rounded-lg bg-white/5 px-3.5 py-2.5 text-sm text-white ring-1 ring-white/10 placeholder:text-gray-500 focus:outline-none focus:ring-indigo-500/50"
      />
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-50"
      >
        <ArrowDownTrayIcon className="size-4" />
        {downloading ? "Preparing..." : "Download PDF"}
      </button>
    </div>
  );
}
