"use client";

import { useState } from "react";
import { LEARN_GROUPS, DEFAULT_LEARN_TOPIC_ID, findLearnTopic } from "./content";
import type { PlanSlug } from "@/libs/contracts";

const PLAN_LABEL: Partial<Record<PlanSlug, string>> = {
  pro: "Pro",
  enterprise: "Managed ASO",
};

export default function LearnPage() {
  const [topicId, setTopicId] = useState(DEFAULT_LEARN_TOPIC_ID);
  const current = findLearnTopic(topicId) ?? findLearnTopic(DEFAULT_LEARN_TOPIC_ID)!;
  const { topic } = current;
  const planLabel = topic.minPlan ? PLAN_LABEL[topic.minPlan] : undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white text-black">
      <div className="px-8 pt-6 pb-4 border-b border-black/10">
        <h1 className="text-xl font-semibold">Learning Center</h1>
        <p className="mt-1 text-sm text-black/60">
          What every ASO Intelligence tool is for, why it matters, and how to get value out of it.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Topic list */}
        <nav className="w-56 shrink-0 overflow-y-auto border-r border-black/10 px-6 py-6 space-y-5">
          {LEARN_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="text-sm font-bold">{group.label}</p>
              <ul className="mt-1.5 space-y-1">
                {group.topics.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      onClick={(e) => { e.preventDefault(); setTopicId(t.id); }}
                      className={`text-[13px] font-normal ${
                        t.id === topicId ? "underline" : "text-black/70 hover:underline"
                      }`}
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Article */}
        <div className="flex-1 min-w-0 overflow-y-auto px-10 py-8">
          <h2 className="text-lg font-semibold">
            {topic.label}
            {planLabel && <span className="ml-2 text-sm font-normal text-black/50">(Requires {planLabel})</span>}
          </h2>

          <p className="mt-3 text-sm leading-relaxed">{topic.description}</p>

          <h3 className="mt-6 text-sm font-semibold">Why it matters</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            {topic.benefits.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold">How to use it</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            {topic.howToUse.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>

          {topic.goodToKnow.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Good to know</h3>
              <ul className="mt-2 list-disc pl-5 space-y-1.5">
                {topic.goodToKnow.map((item, i) => (
                  <li key={i} className="text-sm leading-relaxed">{item}</li>
                ))}
              </ul>
            </>
          )}

          {topic.cta && (
            <div className="mt-8 border-t border-black/10 pt-6">
              <h3 className="text-sm font-semibold">{topic.cta.heading}</h3>
              <p className="mt-2 text-sm leading-relaxed">{topic.cta.body}</p>
              <a
                href={topic.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                {topic.cta.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
