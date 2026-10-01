import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "App Growth Assistant Terms",
  alternates: {
    canonical: "/growth-assistant/terms",
  },
};

const LAST_UPDATED = "October 1, 2026";

export default function GrowthAssistantTermsPage() {
  return (
    <LegalLayout title="App Growth Assistant Terms" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          These App Growth Assistant Terms (&quot;Assistant Terms&quot;) govern your purchase and use of
          the App Growth Assistant service (the &quot;Assistant Service&quot;) from AppASO
          (&quot;AppASO&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By paying a payment
          request or invoice for the Assistant Service, completing checkout, signing an order form, or
          otherwise starting the Assistant Service, you (&quot;you&quot; or the &quot;Client&quot;) agree to
          these Assistant Terms.
        </p>
        <p>
          These Assistant Terms supplement our general <Link href="/terms">Terms of Service</Link>, which
          also apply. If the two conflict, these Assistant Terms control for the Assistant Service. If you
          and AppASO sign a separate written agreement for the Assistant Service, that agreement controls.
        </p>
      </section>

      <section>
        <h2>The Service</h2>
        <p>
          We provide a dedicated assistant (&quot;Assistant&quot;) trained in mobile app growth
          fundamentals and guided by a Senior App Growth Specialist (&quot;Specialist&quot;). The
          Assistant works on your app for up to 40 hours per week, Monday to Friday, during working hours
          you set and we agree to at onboarding.
        </p>
        <p>
          The Assistant can help with work such as keyword and competitor research, app store and review
          monitoring, market research, user feedback analysis, growth experiment support, bug reproduction
          and reporting, and app listing and content updates. The exact scope is agreed at onboarding and
          can be adjusted with the Specialist as your needs change.
        </p>
        <p>The Assistant Service does not include, unless agreed in writing:</p>
        <ul>
          <li>Software development, design production, or legal, tax, or financial advice.</li>
          <li>Advertising spend, paid tools, or other third-party costs, which you pay directly.</li>
          <li>Work outside the agreed working hours, or more than 40 hours in a week.</li>
        </ul>
        <p>
          Unused hours do not roll over to a later week or month. The Assistant is not available on public
          holidays observed in the Assistant&apos;s location; we will share the holiday calendar at
          onboarding.
        </p>
      </section>

      <section>
        <h2>Fees and Billing</h2>
        <p>
          The Assistant Service is billed monthly, in advance, at the price we agreed with you. Your first
          payment covers your first billing month. The Assistant Service continues month to month until
          cancelled: before each new billing month, we will send you a payment request or invoice, which
          is due by the first day of that month.
        </p>
        <p>
          Fees exclude taxes, which you are responsible for where applicable. We may change the monthly
          fee with at least 30 days&apos; written notice; the new fee applies from your next billing period
          after the notice ends.
        </p>
        <p>
          If a payment is not received by its due date, we may pause the Assistant Service until the
          outstanding amount is paid.
        </p>
      </section>

      <section>
        <h2>Start Date</h2>
        <p>
          After your first payment, we will schedule an onboarding call and confirm your Assistant&apos;s
          start date. If your Assistant starts later than the date we confirmed for reasons on our side,
          we will extend your first billing period by the number of working days missed.
        </p>
      </section>

      <section>
        <h2>Cancellation</h2>
        <p>
          There is no long-term contract. You may cancel at any time by emailing{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>, or simply by not paying the next
          month&apos;s payment request. Cancellation takes effect at the end of your current paid month, and your Assistant continues
          working until then.
        </p>
        <p>
          Fees already paid are non-refundable, including for partial months, except where required by
          law or where we cancel the Assistant Service without cause, in which case we will refund the
          unused portion of your current month.
        </p>
      </section>

      <section>
        <h2>Replacement</h2>
        <p>
          If your Assistant is not the right fit, tell us and we will replace them at no extra cost. Your
          replacement starts at the beginning of your next billing month, and your current Assistant keeps
          working until then so there is no gap in coverage. Requests made fewer than 10 working days
          before your next billing date take effect at the start of the following billing month, so we
          have time to recruit and onboard the right person.
        </p>
        <p>
          If your Assistant is unavailable due to illness, leave, or departure, we will provide cover or
          a replacement, or extend your billing period for the working days missed.
        </p>
      </section>

      <section>
        <h2>Your Responsibilities</h2>
        <p>To help your Assistant do good work, you agree to:</p>
        <ul>
          <li>Provide timely access to the accounts, tools, and information needed for the agreed work.</li>
          <li>
            Grant access using roles with the least privilege needed (for example, App Store Connect or
            Google Play Console roles without financial or admin rights where possible).
          </li>
          <li>Review and approve changes before they are published to your app listings, unless you tell us otherwise in writing.</li>
          <li>Not ask the Assistant to do anything unlawful, deceptive, or against app store or platform policies.</li>
          <li>Treat the Assistant with respect and raise any concerns with the Specialist or with us.</li>
        </ul>
        <p>
          You remain responsible for your apps, your accounts, and all decisions about what is published
          or spent.
        </p>
      </section>

      <section>
        <h2>Non-Solicitation</h2>
        <p>
          We invest in recruiting, training, and supervising every Assistant. While you use the Assistant
          Service and for 12 months after it ends, you agree not to hire or engage, directly or through
          another party, any Assistant or Specialist who worked on your account, without our written
          consent.
        </p>
        <p>
          If you would like to hire your Assistant directly, contact us. We may agree to a transfer for a
          one-time placement fee equal to six months of your monthly fee at the time. If you hire or
          engage them without our consent, the same fee becomes due.
        </p>
      </section>

      <section>
        <h2>Confidentiality</h2>
        <p>
          We and our Assistants and Specialists will keep your non-public information confidential, use
          it only to provide the Assistant Service, and not share it with other clients or third parties,
          except our service providers bound by similar obligations or where required by law. Every
          Assistant and Specialist is bound by written confidentiality obligations.
        </p>
        <p>
          When the Assistant Service ends, we will remove our access to your accounts and you should
          revoke any access you granted. We will delete or return your confidential information on
          request, except where we must keep it by law.
        </p>
      </section>

      <section>
        <h2>Ownership of Work</h2>
        <p>
          Once the relevant fees are paid, you own the work your Assistant creates specifically for you,
          such as research, reports, listing copy, and other deliverables. We keep ownership of our own
          tools, templates, methods, and know-how, and of AppASO itself.
        </p>
      </section>

      <section>
        <h2>Included AppASO Pro Plan</h2>
        <p>
          While your Assistant Service is active and paid, your workspace includes AppASO Pro at no extra
          cost. Your use of AppASO is governed by our <Link href="/terms">Terms of Service</Link>. When the
          Assistant Service ends, the included plan ends too, and your workspace moves to the Free plan
          unless you subscribe to a paid plan.
        </p>
      </section>

      <section>
        <h2>No Guaranteed Results</h2>
        <p>
          We will perform the Assistant Service with reasonable skill and care. App store rankings,
          conversion, and downloads depend on many factors outside our control, including app store
          algorithms, competitors, and your product, so we do not guarantee any specific ranking,
          download, or revenue outcome.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPASO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, OR DATA, ARISING
          FROM THE ASSISTANT SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THE ASSISTANT
          SERVICE SHALL NOT EXCEED THE FEES YOU PAID FOR THE ASSISTANT SERVICE IN THE THREE MONTHS
          PRECEDING THE CLAIM.
        </p>
      </section>

      <section>
        <h2>Relationship</h2>
        <p>
          AppASO is an independent contractor. Your Assistant and Specialist are engaged and managed by
          AppASO, not by you, and nothing in these Assistant Terms creates an employment, partnership, or
          agency relationship between you and AppASO or its personnel.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>
          We may update these Assistant Terms from time to time. If we make material changes, we will
          update the &quot;Last updated&quot; date above and notify active clients at least 30 days before
          the changes take effect. Continuing the Assistant Service after that date means you accept the
          revised terms.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          These Assistant Terms are governed by the laws of the State of Delaware, United States, without
          regard to its conflict of law principles, unless otherwise required by applicable local law.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about these Assistant Terms, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
