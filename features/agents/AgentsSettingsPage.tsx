"use client";

import { useState, useTransition } from "react";
import { Cog6ToothIcon, EyeIcon, EyeSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { updateAgentEmailAction, updateEmailTemplateAction } from "@/features/agents/actions";
import { EMAIL_TRIGGER_STATUSES, CRM_STATUS_LABELS, type CrmStatus } from "@/features/agents/types";
import { getDefaultTemplate, applyAppName, renderTemplateHtml } from "@/libs/email/contact-status-update";

// A stand-in for the preview only — never sent anywhere.
const SAMPLE_APP_NAME = "Acme Weather App";

type Template = { subject: string; body: string };

type Props = {
  loginEmail: string;
  replyToEmail: string;
  canManage: boolean;
  templates: Record<CrmStatus, Template>;
};

export default function AgentsSettingsPage({ loginEmail, replyToEmail, canManage, templates }: Props) {
  const [email, setEmail] = useState(replyToEmail);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAgentEmailAction(email);
      setMessage(result.ok ? { text: "Saved.", isError: false } : { text: result.error, isError: true });
    });
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <Cog6ToothIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Settings</h1>
            <p className="text-xs text-gray-500">Logged in as {loginEmail}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
          <h2 className="text-sm font-semibold text-white light:text-gray-900">Your email</h2>
          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
            When a contact&rsquo;s status changes to Left Voicemail, Spoke - Interested, Follow-up Scheduled, or
            Closed - Won, we automatically send them a short follow-up email. Set your email here so their replies
            land in your inbox instead of a shared one — it doesn&rsquo;t have to match the email you log in with.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="flex-1 min-w-[14rem] bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none"
            />
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>

          {message && (
            <p className={`mt-3 text-xs ${message.isError ? "text-red-400 light:text-red-700" : "text-emerald-400 light:text-emerald-700"}`}>
              {message.text}
            </p>
          )}
        </div>

        {canManage && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-white light:text-gray-900 mb-1">Email templates</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              One editable template per status that triggers a contact email. Use{" "}
              <code className="mx-0.5 px-1 py-0.5 rounded bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600">{"{{appName}}"}</code>{" "}
              anywhere
              in the subject or message to insert the contact&rsquo;s App / Company name.
            </p>

            <div className="space-y-4">
              {EMAIL_TRIGGER_STATUSES.map((status) => (
                <TemplateEditor key={status} status={status} initial={templates[status]} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({ status, initial }: { status: CrmStatus; initial: Template }) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [showPreview, setShowPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const defaultTemplate = getDefaultTemplate(status);
  const dirty = subject !== initial.subject || body !== initial.body;
  const isDefault = subject === defaultTemplate.subject && body === defaultTemplate.body;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateEmailTemplateAction(status, subject, body);
      setMessage(result.ok ? { text: "Saved.", isError: false } : { text: result.error, isError: true });
    });
  }

  function handleReset() {
    setMessage(null);
    setSubject(defaultTemplate.subject);
    setBody(defaultTemplate.body);
  }

  return (
    <div className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white light:text-gray-900">{CRM_STATUS_LABELS[status]}</h3>
        <button
          onClick={handleReset}
          disabled={isDefault}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 light:hover:text-gray-700 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
          title="Reset this template to the default copy — you'll still need to Save to keep it"
        >
          <ArrowPathIcon className="size-3.5" />
          Reset to default
        </button>
      </div>

      <label className="block mt-3 text-[11px] font-medium text-gray-500 mb-1">Subject</label>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 outline-none"
      />

      <label className="block mt-3 text-[11px] font-medium text-gray-500 mb-1">Message</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        className="w-full bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 outline-none resize-y leading-relaxed"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending || !dirty}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-4 py-2 text-xs font-medium text-gray-300 light:text-gray-700 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 transition-colors"
        >
          {showPreview ? <EyeSlashIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        {message && (
          <span className={`text-xs ${message.isError ? "text-red-400 light:text-red-700" : "text-emerald-400 light:text-emerald-700"}`}>
            {message.text}
          </span>
        )}
      </div>

      {showPreview && (
        <div className="mt-4 rounded-lg border border-white/10 light:border-black/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/[0.04] light:bg-black/[0.03] text-xs text-gray-400 light:text-gray-600 border-b border-white/10 light:border-black/10">
            <span className="font-medium text-gray-300 light:text-gray-700">Subject:</span> {applyAppName(subject, SAMPLE_APP_NAME)}
            <span className="ml-2 text-gray-600 light:text-gray-400">(preview uses &ldquo;{SAMPLE_APP_NAME}&rdquo; as a stand-in contact)</span>
          </div>
          <div className="bg-white p-5" dangerouslySetInnerHTML={{ __html: renderTemplateHtml(body, SAMPLE_APP_NAME) }} />
        </div>
      )}
    </div>
  );
}
