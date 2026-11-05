import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Growth Starter Terms",
  alternates: {
    canonical: "/growth-starter/terms",
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "/growth-starter/terms",
    title: "Growth Starter Terms | AppASO",
    description: "Terms for the ASO Growth Starter: what's included, scheduling, the AppASO Pro bonus, support, and refunds.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Growth Starter Terms | AppASO",
    description: "Terms for the ASO Growth Starter: what's included, scheduling, the AppASO Pro bonus, support, and refunds.",
    images: ["/opengraph-image"],
  },
};

const LAST_UPDATED = "November 6, 2026";

export default function GrowthStarterTermsPage() {
  return (
    <LegalLayout title="Growth Starter Terms" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          These Growth Starter Terms (&quot;Starter Terms&quot;) govern your purchase of the ASO Growth
          Starter (the &quot;Starter&quot;) from AppASO (&quot;AppASO&quot;, &quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). By paying for the Starter, you (&quot;you&quot; or the
          &quot;Client&quot;) agree to these Starter Terms.
        </p>
        <p>
          These Starter Terms supplement our general <Link href="/terms">Terms of Service</Link>, which
          also apply, including to your use of AppASO Pro. If the two conflict, these Starter Terms control
          for the Starter.
        </p>
      </section>

      <section>
        <h2>What&apos;s Included</h2>
        <p>The Starter covers one app and includes:</p>
        <ul>
          <li>
            <strong>AppASO Pro:</strong> 2 months of access to the AppASO Pro plan, starting on the date of
            purchase. If you already have a paid AppASO subscription, it keeps running instead and no
            separate Pro access is added.
          </li>
          <li>
            <strong>Onboarding:</strong> one 30-minute video call covering ASO basics and how to use AppASO Pro.
          </li>
          <li>
            <strong>Strategy session:</strong> one 60-minute video call in which we go through a keyword
            opportunity analysis and a competitor analysis for your app, in one store and one country or
            language of your choice; review your store listing and the experience a new user sees in your
            app, such as onboarding and the paywall (the &quot;app roast&quot;); and agree a growth strategy
            and your priorities.
          </li>
          <li>
            <strong>Specialist support:</strong> for 2 months after the strategy session, the specialist who
            prepared your analysis answers your questions about your strategy by email, usually within 2
            working days. If they are unavailable, another member of our team answers instead.
          </li>
        </ul>
        <p>
          The analysis, app roast, and strategy are presented live on the call. We do not deliver a written
          report, analysis, or roadmap. You may record the call, and you may take your own notes.
        </p>
        <p>
          The Starter is guidance only. App roast feedback is advice, not design or development work. You make the changes to your store listing yourself. We do not edit
          your listing, run A/B tests, produce creatives, or manage ads as part of the Starter. Anything not
          listed above is out of scope unless we agree to it in writing, which may involve an additional
          fee.
        </p>
      </section>

      <section>
        <h2>Scheduling</h2>
        <ul>
          <li>
            After purchase, we email you to schedule your onboarding call. We schedule the strategy session within 7 working
            days of onboarding, once your analysis is ready.
          </li>
          <li>
            Both calls must take place within 60 days of purchase. Calls not scheduled by then expire and are
            not refunded, unless the delay was on our side.
          </li>
          <li>
            You may reschedule each call once with at least 24 hours&apos; notice. A call you miss without
            notice counts as delivered.
          </li>
        </ul>
      </section>

      <section>
        <h2>AppASO Pro Access and Bonus</h2>
        <p>
          We may offer you a bonus that extends your Pro access to 12 months if you buy the Starter by a
          deadline we give you. The bonus applies only to a purchase made through the bonus link we send you,
          before the end of the deadline date in any time zone. It cannot be added to a purchase made without
          that link or after the deadline.
        </p>
        <p>
          Pro access from the Starter, with or without the bonus, starts on the date of purchase and does not
          renew automatically. When it ends, your account moves to the Free plan, under the same rules as any
          other plan change. You can subscribe to a paid plan at any time to keep Pro features. Pro access
          from the Starter has no cash value, and a refund of the Starter also ends it.
        </p>
        <p>
          If you already have a paid AppASO subscription, contact us before buying the Starter with a bonus
          and we will arrange it so you are not charged twice for Pro.
        </p>
      </section>

      <section>
        <h2>Fees and Refunds</h2>
        <p>
          The Starter is a single payment of the price shown at checkout, charged in advance. Fees exclude
          taxes, which you are responsible for where applicable.
        </p>
        <p>
          The Starter is non-refundable, except where required by law. If we
          cannot deliver a call for reasons on our side, we will refund the value of the
          undelivered part.
        </p>
      </section>

      <section>
        <h2>Your Responsibilities</h2>
        <ul>
          <li>Tell us which app, store, and market the analysis should cover before onboarding.</li>
          <li>
            If reaching your paywall or purchase flow needs an account, invite code, or paid download, give us
            access before the strategy session.
          </li>
          <li>Reply to our scheduling emails, attend the calls you schedule, or reschedule them in time.</li>
          <li>Decide which recommendations to apply, and keep your app compliant with store policies.</li>
        </ul>
      </section>

      <section>
        <h2>No Results Guarantee</h2>
        <p>
          We do not guarantee any specific level of installs, revenue, rankings, organic visibility, or
          other business outcomes. These depend on factors beyond our control, including market conditions,
          competition, store algorithms, product quality, and which recommendations you apply. Our
          commitment is to the quality and timely delivery of the items listed in What&apos;s Included.
        </p>
      </section>

      <section>
        <h2>Ownership of Work</h2>
        <p>
          Once paid for, you can keep and use your call recording, your notes, and anything we share with
          you during the Starter, after it ends. We keep ownership of our own tools, templates, methods, and know-how, and of
          AppASO itself.
        </p>
      </section>

      <section>
        <h2>Case Studies &amp; Confidentiality</h2>
        <p>
          We will not publicly disclose your name, company, app, results, or any other information about you
          or the Starter without your prior written approval. No case studies or testimonials will be
          published without your consent.
        </p>
        <p>
          We will use your non-public information only to deliver the Starter and will not share it with
          other clients or third parties, except our service providers bound by similar obligations or
          where required by law.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPASO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, OR DATA, ARISING
          FROM THE STARTER. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THE STARTER SHALL NOT EXCEED
          THE FEE YOU PAID FOR IT.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>
          We may update these Starter Terms from time to time by updating the &quot;Last updated&quot; date
          above. Changes do not apply to a Starter you have already bought.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          These Starter Terms are governed by the laws of the State of Delaware, United States, without
          regard to its conflict of law principles, unless otherwise required by applicable local law.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about these Starter Terms, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
