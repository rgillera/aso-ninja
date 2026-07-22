"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import type { App } from "@/libs/contracts";
import type { ConnectionStatus } from "@/libs/store-connections/types";

type Props = { app: App };

function StatusBadge({ connection }: { connection: ConnectionStatus }) {
  if (!connection.connected) {
    return <span className="text-xs text-gray-500">Not connected</span>;
  }
  if (connection.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
        <ExclamationTriangleIcon className="size-3.5" />
        Connection error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
      <CheckCircleIcon className="size-3.5" />
      Connected
    </span>
  );
}

function IosConnectForm({ appId, onConnected }: { appId: string; onConnected: (c: ConnectionStatus) => void }) {
  const [issuerId, setIssuerId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [vendorNumber, setVendorNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPrivateKey(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/apps/${appId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerId, keyId, privateKey, vendorNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't connect this app.");
        return;
      }
      onConnected({ connected: true, status: "connected" });
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Issuer ID</label>
          <input
            value={issuerId}
            onChange={(e) => setIssuerId(e.target.value)}
            placeholder="69a6de7f-...-47e3-e053-5b8c7c11a4d1"
            required
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            App Store Connect → Users and Access → Integrations
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Key ID</label>
          <input
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="2X9R4HXF34"
            required
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            Shown next to the key you generate on that same page
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Vendor Number</label>
          <input
            value={vendorNumber}
            onChange={(e) => setVendorNumber(e.target.value)}
            placeholder="e.g. 12345678"
            required
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            App Store Connect → Reports
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-400">Private key (.p8)</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Upload file
            </button>
            <input ref={fileInputRef} type="file" accept=".p8" className="hidden" onChange={handleFileChosen} />
          </div>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            required
            rows={6}
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            App Store Connect → Users and Access → Integrations, shown right after you generate the key. Only downloadable once, so save the file.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <ExclamationTriangleIcon className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-wait px-4 py-2 text-xs font-semibold text-white transition-colors"
        >
          {submitting && <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {submitting ? "Validating…" : "Connect"}
        </button>
      </form>

      <div className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] px-3.5 py-3">
        <p className="text-[11px] font-medium text-gray-400 mb-1.5">Before connecting</p>
        <ol className="text-[11px] text-gray-500 list-decimal list-inside space-y-1.5">
          <li>
            In App Store Connect, go to Users and Access → Integrations → App Store Connect API, then
            copy the Issuer ID shown at the top of that page.
          </li>
          <li>
            Click Generate API Key (or the + button). Name it whatever you like, and under Access
            select a role that includes report access, such as Finance or Admin. App Manager alone
            usually does not grant Sales Report access.
          </li>
          <li>
            Once generated, copy the Key ID shown next to the new key, and download the .p8 file
            immediately. Apple only allows the download once, so save it somewhere safe.
          </li>
          <li>
            Separately, find your Vendor Number under Reports. It is not on the Integrations page
            and is easy to miss.
          </li>
        </ol>
      </div>
    </div>
  );
}

function AndroidConnectForm({ appId, onConnected }: { appId: string; onConnected: (c: ConnectionStatus) => void }) {
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setServiceAccountJson(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/apps/${appId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAccountJson, bucketId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't connect this app.");
        return;
      }
      onConnected({ connected: true, status: "connected" });
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Cloud Storage bucket ID</label>
          <input
            value={bucketId}
            onChange={(e) => setBucketId(e.target.value)}
            placeholder="pubsite_prod_rev_01234567890987654321"
            required
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            Play Console → Setup → API access → Download reports
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-400">Service account JSON key</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Upload file
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChosen} />
          </div>
          <textarea
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.target.value)}
            placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
            required
            rows={6}
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus:ring-indigo-500/40 outline-none px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600">
            Google Cloud Console → IAM &amp; Admin → Service Accounts → Keys
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <ExclamationTriangleIcon className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-wait px-4 py-2 text-xs font-semibold text-white transition-colors"
        >
          {submitting && <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {submitting ? "Validating…" : "Connect"}
        </button>
      </form>

      <div className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] px-3.5 py-3">
        <p className="text-[11px] font-medium text-gray-400 mb-1.5">Before connecting</p>
        <ol className="text-[11px] text-gray-500 list-decimal list-inside space-y-1.5">
          <li>Play Console: Setup → API access → enable Cloud Storage download reports (if not already on).</li>
          <li>Google Cloud Console: create a service account, then generate a JSON key for it.</li>
          <li>Grant that service account read access to the bucket shown in Play Console&apos;s download reports settings.</li>
          <li>Play Console: give the same service account &quot;View app info&quot; permission, set to Global.</li>
        </ol>
      </div>
    </div>
  );
}

export default function AppConnectionSettings({ app }: Props) {
  const planSlug = usePlanSlug();
  // Only gates connecting for the first time — an already-connected app
  // stays manageable here (status/sync/disconnect) even after a downgrade,
  // so a workspace that drops below Pro can still remove its own
  // credentials instead of being locked out of its own settings. The actual
  // value display in Keyword Research/Performance re-checks the plan on
  // every load regardless, so nothing gated is exposed by leaving this
  // reachable.
  const downloadsLocked = !isPlanAtLeast(planSlug, "pro");
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // No synchronous setState call at the top of this function — `loading`
  // already starts true (see useState above), and refreshes triggered by
  // handleSync/handleDisconnect intentionally don't flip it back on, so the
  // whole panel doesn't flash back to the skeleton (those already have their
  // own button-level spinners).
  const loadStatus = useCallback(() => {
    return fetch(`/api/apps/${app.id}/connect`)
      .then((res) => res.json())
      .then((data: ConnectionStatus) => setConnection(data))
      .catch(() => setConnection({ connected: false }))
      .finally(() => setLoading(false));
  }, [app.id]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/apps/${app.id}/sync-downloads`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setSyncError(data.error ?? "Sync failed."); }
      await loadStatus();
    } catch {
      setSyncError("Couldn't reach the server.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/apps/${app.id}/connect`, { method: "DELETE" });
      await loadStatus();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={app} title="Settings" />

      <div className="flex-1 overflow-y-auto p-6">
        {!loading && !connection?.connected && downloadsLocked ? (
          // Rendered on its own, not nested inside the card below —
          // FeatureLocked already has its own bordered card styling, so
          // wrapping it in another one just doubles up the border.
          <FeatureLocked
            title="Connecting real download data requires Pro"
            description="Pull this app's real daily download total from App Store Connect or Play Console, so Keyword Research and Performance can show an Estimated Downloads figure per keyword."
            minPlan="pro"
            icon={ArrowTrendingUpIcon}
            benefits={[
              "Real daily download totals for apps you own",
              "Estimated Downloads per keyword in Keyword Research and Performance",
              "Manual or automatic daily sync",
            ]}
          />
        ) : (
        <div className="w-full rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-semibold text-white">
              {app.store === "ios" ? "App Store Connect" : "Google Play Console"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Connect this app to pull its real daily download total, so the keyword research
              table can show an Estimated Downloads figure per keyword instead of no data at all.
              Neither store attributes downloads to specific search terms, so this splits the real
              total across your tracked keywords by search volume and current rank.
            </p>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="h-20 flex items-center justify-center">
                <span className="size-4 rounded-full border-2 border-gray-600 border-t-gray-300 animate-spin" />
              </div>
            ) : connection?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <StatusBadge connection={connection} />
                  {connection.lastSyncedOn && (
                    <span className="text-xs text-gray-600">Last synced {connection.lastSyncedOn}</span>
                  )}
                </div>
                {connection.displayLabel && (
                  <p className="text-xs text-gray-500">{connection.displayLabel}</p>
                )}
                {connection.status === "error" && connection.lastError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    {connection.lastError}
                  </div>
                )}
                {syncError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    {syncError}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] hover:ring-indigo-500/40 disabled:opacity-50 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    <ArrowPathIcon className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors"
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              </div>
            ) : app.store === "ios" ? (
              <IosConnectForm appId={app.id} onConnected={loadStatus} />
            ) : (
              <AndroidConnectForm appId={app.id} onConnected={loadStatus} />
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
