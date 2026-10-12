import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Growth Sprint Terms",
  alternates: {
    canonical: "/growth-sprint/terms",
  },
};

const LAST_UPDATED = "October 12, 2026";

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
          and store(s) covered and your payment option (see Fees and Payment). The Sprint includes:
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
            <strong>Funnel optimization:</strong> analyze the user journey from store impression to install
            to sale, fix the biggest drop-offs in your store listing and campaigns, and give your team
            clear recommendations for steps inside your app, which your team implements.
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
          <li>
            The Sprint cannot be paused or cancelled early by you once it has started, except under the
            First-Month Guarantee described in Our Guarantees.
          </li>
          <li>Results require testing and iteration over the full 90 days, which is why the Sprint is a fixed commitment.</li>
        </ul>
        <p>
          We may end the Sprint if you materially breach these Sprint Terms and do not fix the breach
          within 14 days of notice. If we end the Sprint without cause, we will refund the fees you have
          paid in proportion to the days remaining, and cancel any monthly payments not yet due.
        </p>
      </section>

      <section>
        <h2>Fees and Payment</h2>
        <p>You can pay for the Sprint in one of two ways:</p>
        <ul>
          <li>
            <strong>Monthly:</strong> $1,500 per month for 3 months ($4,500 in total). The first payment
            is due before kickoff, the second on Day 31, and the third on Day 61.
          </li>
          <li>
            <strong>Upfront:</strong> $4,000, paid in full before kickoff.
          </li>
        </ul>
        <p>
          The &quot;Sprint fee&quot; means the total for your payment option: $4,500 on the monthly
          option, or $4,000 on the upfront option. Either way, the Sprint is a fixed 3-month commitment,
          and on the monthly option you agree to make all three payments. We schedule your kickoff call
          once the first payment is received. If a monthly payment is more than 7 days late, we may pause
          work until it is paid, and the pause does not extend the Sprint.
        </p>
        <p>
          Fees exclude taxes, which you are responsible for where applicable. Fees are non-refundable once
          paid, except as described in Term &amp; Commitment and Our Guarantees, or where required by law.
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

      <section id="guarantees">
        <h2>Our Guarantees</h2>
        <p>
          We cannot guarantee business results (see No Results Guarantee), but we do guarantee our own
          work. The Sprint comes with the following guarantees.
        </p>

        <h3>Day 45 Guarantee</h3>
        <p>
          We commit to having your quick wins live and your first A/B tests running by Day 45. If either
          is missed, your next month is free. For this guarantee:
        </p>
        <ul>
          <li>
            <strong>Quick wins</strong> means the metadata rewrite (title, subtitle, and keyword field)
            and the other quick-win fixes named in your audit.
          </li>
          <li>
            <strong>Live</strong> means submitted to the App Store or Google Play. Time the store takes to
            review a submission is not counted.
          </li>
          <li>
            <strong>First A/B tests running</strong> means at least one icon, screenshot, or store listing
            test has been started in Product Page Optimization or Store Listing Experiments.
          </li>
        </ul>
        <p>
          You do not need to claim this guarantee. We apply it automatically:
        </p>
        <ul>
          <li>
            <strong>Monthly option:</strong> we waive your third payment ($1,500), due on Day 61.
          </li>
          <li>
            <strong>Upfront option:</strong> we refund one month ($1,333.33, one third of the upfront
            fee) within 14 days of Day 45.
          </li>
        </ul>
        <p>The Sprint continues as planned, and you still receive the full 90 days of work.</p>

        <h3>First-Month Guarantee</h3>
        <p>
          If you are not satisfied with the Sprint, you may end it by emailing us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a> no later than the end of Day 30. Notices
          received after Day 30 are not covered. You will not pay for the remaining two months:
        </p>
        <ul>
          <li>
            <strong>Monthly option:</strong> we cancel your second and third payments, and no further
            payments are due.
          </li>
          <li>
            <strong>Upfront option:</strong> we refund two months ($2,666.67, two thirds of the upfront
            fee) within 14 days of your notice.
          </li>
        </ul>
        <p>
          You keep the audit, roadmap, and any other deliverables created up to that point. The included
          AppASO Pro plan ends when the Sprint ends under this guarantee, and your workspace moves to the
          Free plan unless you subscribe to a paid plan.
        </p>

        <h3>Work-Until-Done Guarantee</h3>
        <p>
          If a deliverable listed in the Engagement Overview is not finished by Day 90, we will keep
          working on that deliverable at no extra cost until it is finished. This covers completing the
          unfinished deliverable only. It does not extend ongoing services such as campaign management,
          keyword expansion, or reporting beyond Day 90.
        </p>

        <h3>Fixing Deliverables</h3>
        <p>
          If you believe a deliverable listed in the Engagement Overview was not provided, notify us in
          writing at <a href="mailto:hello@appaso.io">hello@appaso.io</a> within 7 days of when it was
          due. We will review your concern and fix or re-deliver the item promptly. If a deliverable still
          cannot be fulfilled after correction, you may be eligible for a partial refund, limited to the
          value of the undelivered work.
        </p>

        <h3>Conditions</h3>
        <ul>
          <li>
            These guarantees do not apply where a missed Day 45 milestone or unfinished deliverable is caused by
            delays on your side, as described in Your Responsibilities, such as missing access, assets, or
            approvals, or by platform issues described in Experiments and Platform Limits.
          </li>
          <li>Total refunds and waived payments under these guarantees will never exceed the Sprint fee.</li>
          <li>
            These guarantees cover the delivery of the work, not performance results such as installs,
            revenue, rankings, or return on investment.
          </li>
        </ul>
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
          Once you have paid for the period in which we created them, you own the deliverables we create specifically for you, including
          your audit, roadmap, listing copy, ad creatives, test results, reports, and handoff playbook. You
          can keep and use them after the Sprint ends, with or without us. We keep ownership of our own
          tools, templates, methods, and know-how, and of AppASO itself.
        </p>
      </section>

      <section>
        <h2>Included AppASO Pro Plan</h2>
        <p>
          Your Sprint includes one year of AppASO Pro at no extra cost, starting on Day 1. It keeps running
          after the Sprint ends until the year is up, unless it ends early under the First-Month
          Guarantee. Your use of AppASO is governed by our{" "}
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
