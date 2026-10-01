import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Growth Sprint Terms",
  alternates: {
    canonical: "/growth-sprint/terms",
  },
};

const LAST_UPDATED = "October 1, 2026";

export default function GrowthSprintTermsPage() {
  return (
    <LegalLayout title="Growth Sprint Terms" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          These Growth Sprint Terms (&quot;Sprint Terms&quot;) govern your purchase of the 90-Day ASO
          Growth Sprint (the &quot;Sprint&quot;) from AppASO (&quot;AppASO&quot;, &quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). By paying for the Sprint, signing an order form, or
          otherwise starting the Sprint, you (&quot;you&quot; or the &quot;Client&quot;) agree to these
          Sprint Terms.
        </p>
        <p>
          These Sprint Terms supplement our general <Link href="/terms">Terms of Service</Link>, which also
          apply. If the two conflict, these Sprint Terms control for the Sprint. If you and AppASO sign a
          separate written agreement for the Sprint, that agreement controls.
        </p>
      </section>

      <section>
        <h2>Engagement Overview</h2>
        <p>
          You engage AppASO for a fixed 90-day Sprint focused on identifying and executing growth
          opportunities for your mobile app. Your quote or order form (&quot;Order&quot;) sets out the app
          and store(s) covered and the fee. The Sprint includes:
        </p>
        <ul>
          <li>
            <strong>Comprehensive ASO audit:</strong> identify growth opportunities across your app&apos;s
            visibility, conversion, and overall store presence.
          </li>
          <li>
            <strong>Metadata &amp; keyword optimization:</strong> build a targeted keyword strategy and
            optimize your store listing to maximize organic discoverability.
          </li>
          <li>
            <strong>Monthly keyword expansion:</strong> continuously uncover and target new,
            high-potential keywords to grow your organic reach.
          </li>
          <li>
            <strong>Store listing experiments:</strong> test creatives, messaging, and positioning to
            improve conversion rates and drive more installs.
          </li>
          <li>
            <strong>Funnel optimization:</strong> analyze the user journey from impression to install and
            identify opportunities to reduce drop-off and improve conversion.
          </li>
          <li>
            <strong>Performance tracking &amp; reporting:</strong> monitor key growth metrics and provide
            clear, actionable insights to guide ongoing optimization.
          </li>
          <li>
            <strong>Paid user acquisition:</strong> manage and optimize Meta Ads and Apple Search Ads to
            acquire high-quality users efficiently.
          </li>
          <li>
            <strong>Ad creative development:</strong> create performance-focused ad creatives designed to
            capture attention and drive installs.
          </li>
          <li>
            <strong>Growth strategy &amp; scaling:</strong> develop a data-driven growth roadmap and scale
            winning channels, campaigns, and experiments.
          </li>
          <li>
            <strong>Hands-on collaboration:</strong> work closely with your team throughout execution,
            optimization, testing, and strategic decision-making.
          </li>
          <li>
            <strong>Dedicated AppASO workspace:</strong> your own AppASO workspace with the Pro plan
            included, as described below.
          </li>
        </ul>
        <p>
          Anything not listed above is out of scope unless we agree to it in writing, which may involve an
          additional fee.
        </p>
      </section>

      <section>
        <h2>Term &amp; Commitment</h2>
        <ul>
          <li>The Sprint is a fixed 3-month engagement. Day 1 is the date of your kickoff call, and the Sprint ends on day 90.</li>
          <li>The Sprint cannot be paused or cancelled early by you once it has started.</li>
          <li>Results require testing and iteration over the full 90 days, which is why the Sprint is a fixed commitment.</li>
        </ul>
        <p>
          We may end the Sprint if you materially breach these Sprint Terms and do not fix the breach
          within 14 days of notice. If we end the Sprint without cause, we will refund the Sprint fee in
          proportion to the days remaining.
        </p>
      </section>

      <section>
        <h2>Fees and Payment</h2>
        <p>
          The full Sprint fee for all three months is paid upfront, before kickoff. We schedule your
          kickoff call once payment is received.
        </p>
        <p>
          Fees exclude taxes, which you are responsible for where applicable. Fees are non-refundable once
          paid, except as described in Term &amp; Commitment and Satisfaction Guarantee, or where required
          by law.
        </p>
      </section>

      <section>
        <h2>Advertising Spend and Third-Party Costs</h2>
        <p>
          The Sprint fee covers our work only. Advertising spend on Meta, Apple Search Ads, or any other
          platform is billed separately and paid by you directly to the platform, through ad accounts you
          own. We will agree test budgets with you before spending, and we will not exceed an agreed budget
          without your approval. Any paid tools or other third-party costs are also yours.
        </p>
      </section>

      <section>
        <h2>Satisfaction Guarantee</h2>
        <p>
          If you believe a deliverable listed in the Engagement Overview was not provided, notify us in
          writing at <a href="mailto:hello@appaso.io">hello@appaso.io</a> within 7 days of when it was
          due. We will:
        </p>
        <ul>
          <li>Review your concern, and</li>
          <li>Fix or re-deliver the item promptly.</li>
        </ul>
        <p>
          If a deliverable still cannot be fulfilled after correction, you may be eligible for a partial
          refund, limited to the value of the undelivered work.
        </p>
        <p>
          This guarantee covers the delivery of the work, not performance results such as installs,
          revenue, rankings, or return on investment.
        </p>
      </section>

      <section>
        <h2>Scope Protection</h2>
        <p>
          Requests outside the scope listed in the Engagement Overview, such as extra creatives, additional
          channels, apps, stores, or regions, extra revisions, or ongoing support, are not included. They
          require our written approval and additional fees before we start the work.
        </p>
      </section>

      <section>
        <h2>Your Responsibilities</h2>
        <p>The Sprint moves on a fixed timeline, so you agree to:</p>
        <ul>
          <li>
            Provide timely access to the tools and accounts we need, such as your app store consoles,
            analytics, ad accounts, and creative assets, using roles with the least privilege needed.
          </li>
          <li>Respond to our requests and approvals within a reasonable timeframe, usually 3 working days.</li>
          <li>Name one decision maker who can review and approve changes.</li>
          <li>Approve listing changes, A/B tests, and ad budgets before they go live.</li>
          <li>Keep your app compliant with App Store and Google Play policies.</li>
        </ul>
        <p>
          Delays caused by missing access or feedback may impact results. The Sprint runs on its original
          schedule even if we are waiting on you, and while we will keep working on what we can, work that
          depends on delayed items may be reduced in scope. Delays on your side do not extend the Sprint or
          entitle you to a refund.
        </p>
      </section>

      <section>
        <h2>Experiments and Platform Limits</h2>
        <p>
          A/B tests and paid campaigns depend on features and policies of Apple, Google, Meta, and other
          platforms, and on your app&apos;s traffic. Some tests may need more time or traffic than the
          Sprint allows to produce a clear result. App review delays, platform outages, or policy changes
          outside our control may affect what can be tested during the Sprint.
        </p>
      </section>

      <section>
        <h2>No Results Guarantee</h2>
        <p>
          We do not guarantee any specific level of installs, revenue, rankings, organic visibility,
          return on ad spend (ROAS), or other business outcomes. These results depend on factors beyond our
          control, including market conditions, competition, platform algorithms, advertising performance,
          pricing, product quality, and decisions on your side.
        </p>
        <p>
          We do guarantee professional, diligent, and timely execution of the Sprint, including delivery
          of the services listed in the Engagement Overview. We will provide expert strategies, actionable
          recommendations, ongoing optimization, performance monitoring, and clear reporting designed to
          give you the best practical foundation for sustainable app growth.
        </p>
        <p>
          Our commitment is to the quality and execution of the work, not to a guaranteed business
          outcome.
        </p>
      </section>

      <section>
        <h2>Ownership of Work</h2>
        <p>
          Once the Sprint fee is paid, you own the deliverables we create specifically for you, including
          your audit, roadmap, listing copy, ad creatives, test results, reports, and handoff playbook. You
          can keep and use them after the Sprint ends, with or without us. We keep ownership of our own
          tools, templates, methods, and know-how, and of AppASO itself.
        </p>
      </section>

      <section>
        <h2>Included AppASO Pro Plan</h2>
        <p>
          Your Sprint includes one year of AppASO Pro at no extra cost, starting on Day 1, and it continues
          for the full year after the Sprint ends. Your use of AppASO is governed by our{" "}
          <Link href="/terms">Terms of Service</Link>, and when the included plan ends, your workspace moves
          to the Free plan unless you subscribe to a paid plan.
        </p>
      </section>

      <section>
        <h2>Case Studies &amp; Confidentiality</h2>
        <p>
          We will not publicly disclose, reference, or share any information about you or the Sprint
          without your prior written approval. This includes, but is not limited to:
        </p>
        <ul>
          <li>Your name, company name, logo, or brand.</li>
          <li>Your app name, screenshots, or other identifying materials.</li>
          <li>Campaigns, strategies, methodologies, or performance data.</li>
          <li>Results, insights, metrics, revenue, or other business information.</li>
          <li>Any other information that could identify you or reveal details of the Sprint.</li>
        </ul>
        <p>
          No case studies, testimonials, portfolio materials, marketing content, or public references will
          be created or published without your prior written consent.
        </p>
        <p>
          We will use your non-public information only to deliver the Sprint and will not share it with
          other clients or third parties, except our service providers bound by similar obligations or
          where required by law. When the Sprint ends, we will remove our access to your accounts, and you
          should revoke any access you granted. We will delete or return your confidential information on
          request, except where we must keep it by law.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>We are not responsible for:</p>
        <ul>
          <li>Actions taken by Apple, Google, or other app stores, such as app rejections, removals, or ranking changes.</li>
          <li>Ad platform issues, such as account restrictions, disapproved ads, outages, or billing errors.</li>
          <li>Lost revenue, lost profits, or indirect damages.</li>
        </ul>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPASO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
          ADVERTISING SPEND, ARISING FROM THE SPRINT. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THE
          SPRINT SHALL NOT EXCEED THE SPRINT FEE YOU PAID.
        </p>
      </section>

      <section>
        <h2>Post-Sprint Options</h2>
        <p>After the 90 days, you may choose to:</p>
        <ul>
          <li>
            <strong>Continue with a Growth Assistant:</strong> keep working with a dedicated{" "}
            <Link href="/growth-assistant">App Growth Assistant</Link> for up to 40 hours per week, on your
            preferred working hours, guided directly by our Senior App Growth Specialist.
          </li>
          <li>
            <strong>Customize the engagement:</strong> move into a custom engagement tailored to your
            evolving growth goals, priorities, and resources.
          </li>
          <li>
            <strong>Scale or adjust support:</strong> increase, reduce, or redefine the scope of support
            based on your app&apos;s needs and growth stage.
          </li>
          <li>
            <strong>End the engagement:</strong> finish when the Sprint ends, with no further obligation.
          </li>
        </ul>
        <p>
          Any continued engagement is governed by its own terms, such as our{" "}
          <Link href="/growth-assistant/terms">App Growth Assistant Terms</Link>, or a separate written
          agreement.
        </p>
      </section>

      <section>
        <h2>Relationship</h2>
        <p>
          AppASO is an independent contractor. Nothing in these Sprint Terms creates an employment,
          partnership, or agency relationship between you and AppASO or its personnel.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>
          We may update these Sprint Terms from time to time by updating the &quot;Last updated&quot; date
          above. The version in effect when you paid for your Sprint applies to that Sprint.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          These Sprint Terms are governed by the laws of the State of Delaware, United States, without
          regard to its conflict of law principles, unless otherwise required by applicable local law.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about these Sprint Terms, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
