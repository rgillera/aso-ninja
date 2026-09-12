"use client";

import { useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { AsaConnectionStatus } from "@/libs/asa-connections/types";

type Props = { workspaceId: string; onConnected: (c: AsaConnectionStatus) => void };

// Mirrors IosConnectForm in features/aso/settings/index.tsx — same field
// styling, file-upload UX, and error surfacing, adapted to Apple Search
// Ads' credential shape (Client ID/Team ID/Key ID + private key, no vendor
// number, and workspace-scoped rather than app-scoped).
export function ConnectAsaForm({ workspaceId, onConnected }: Props) {
  const [clientId, setClientId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
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
      const res = await fetch("/api/asa/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, clientId, teamId, keyId, privateKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't connect Apple Search Ads.");
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
          <label className="block text-xs font-medium text-gray-400 light:text-gray-600 mb-1.5">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="SEARCHADS.a1b2c3d4-..."
            required
            className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 light:text-gray-800 placeholder-gray-600 light:placeholder-gray-400 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600 light:text-gray-400">Apple Search Ads → Account Settings → API</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 light:text-gray-600 mb-1.5">Team ID</label>
          <input
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="SEARCHADS.a1b2c3d4-..."
            required
            className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 light:text-gray-800 placeholder-gray-600 light:placeholder-gray-400 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600 light:text-gray-400">Shown on the same API settings page</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 light:text-gray-600 mb-1.5">Key ID</label>
          <input
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="2X9R4HXF34"
            required
            className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 focus:ring-indigo-500/40 outline-none px-3 py-2 text-sm text-gray-200 light:text-gray-800 placeholder-gray-600 light:placeholder-gray-400 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600 light:text-gray-400">Shown next to the key you generate</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-400 light:text-gray-600">Private key</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-600 transition-colors"
            >
              Upload file
            </button>
            <input ref={fileInputRef} type="file" accept=".pem,.p8,.txt" className="hidden" onChange={handleFileChosen} />
          </div>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            required
            rows={6}
            className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 focus:ring-indigo-500/40 outline-none px-3 py-2 text-xs font-mono text-gray-200 light:text-gray-800 placeholder-gray-600 light:placeholder-gray-400 transition-all"
          />
          <p className="mt-1 text-[11px] text-gray-600 light:text-gray-400">
            The private-key.pem file you generated yourself in step 2 — never uploaded to Apple, so paste or upload your own copy here.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400 light:text-red-600">
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

      <div className="rounded-lg bg-white/[0.03] light:bg-black/[0.03] px-3.5 py-3">
        <p className="text-[11px] font-medium text-gray-400 light:text-gray-600 mb-1.5">Before connecting</p>
        <ol className="text-[11px] text-gray-500 list-decimal list-inside space-y-1.5">
          <li>You need to be the Apple Search Ads Account Owner. Account Admin can see the API tab but can&apos;t generate a key from it — ask whoever holds Account Owner to do this part, or to grant your user the API role first.</li>
          <li>
            Generate a key pair yourself (Apple doesn&apos;t create one for you) — run:
            <br />
            <code className="text-[10px] bg-black/30 light:bg-black/5 px-1 py-0.5 rounded">openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem</code>
            <br />
            <code className="text-[10px] bg-black/30 light:bg-black/5 px-1 py-0.5 rounded">openssl ec -in private-key.pem -pubout -out public-key.pem</code>
          </li>
          <li>
            Run <code className="text-[10px] bg-black/30 light:bg-black/5 px-1 py-0.5 rounded">cat public-key.pem</code> and copy the output.
          </li>
          <li>In Apple Search Ads, go to Account Settings → API → Generate API Key, paste that public key text into the textbox there, and submit.</li>
          <li>Apple shows you the Client ID, Team ID, and Key ID for the key you just created — copy those. Your private key never goes to Apple, so there&apos;s nothing to download from them; keep the private-key.pem file you generated in step 2.</li>
          <li>One connection covers every app your Apple Search Ads account runs campaigns for — you won&apos;t need to reconnect per app.</li>
        </ol>
      </div>
    </div>
  );
}
