import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Growth Retainer Terms",
  alternates: {
    canonical: "/growth-retainer/terms",
  },
  openGraph: {
    type: "website",
    url: "/growth-retainer/terms",
    title: "Growth Retainer Terms | AppASO",
    description: "Terms for the ASO Growth Retainer: monthly scope, billing, cancellation, ad account management, and ownership of work.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Growth Retainer Terms | AppASO",
    description: "Terms for the ASO Growth Retainer: monthly scope, billing, cancellation, ad account management, and ownership of work.",
    images: ["/opengraph-image"],
  },
};

const LAST_UPDATED = "October 24, 2026";

export default function GrowthRetainerTermsPage() {
  return (
    <LegalLayout title="Growth Retainer Terms" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          These Growth Retainer Terms (&quot;Retainer Terms&quot;) govern your purchase of the ASO Growth
          Retainer (the &quot;Retainer&quot;) from AppASO (&quot;AppASO&quot;, &quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). By paying for the Retainer, accepting a proposal, or
          otherwise starting the Retainer, you (&quot;you&quot; or the &quot;Client&quot;) agree to these
          Retainer Terms.
        </p>
        <p>
          These Retainer Terms supplement our general <Link href="/terms">Terms of Service</Link>, which
          also apply. If the two conflict, these Retainer Terms control for the Retainer. If you and AppASO
          sign a separate written agreement for the Retainer, that agreement controls.
        </p>
      </section>

      <section>
        <h2>Engagement Overview</h2>
        <p>
          You engage AppASO for ongoing, month-to-month growth work on your mobile app. Your proposal sets
          out the app and store(s) covered, your start date, and your monthly rate. Each month of the
          Retainer includes:
        </p>
        <ul>
          <li>
            <strong>Keyword upkeep:</strong> a monthly review of your keyword coverage and rankings, with
            metadata updates shipped to your store listing.
          </li>
          <li>
            <strong>Listing experiments:</strong> one new icon, screenshot, or store listing experiment
            each month, planned, run, or read out, depending on where the previous test stands.
          </li>
          <li>
            <strong>Ad management:</strong> weekly management of your Meta Ads and Apple Search Ads
            campaigns, including budgets, bids, keywords, audiences, and targeting. We manage these two
            channels only.
          </li>
          <li>
            <strong>Creative production:</strong> a weekly refresh of Meta ad creatives and one new set of
            store screenshots each month, in the quantities and formats stated in your proposal.
          </li>
          <li>
            <strong>Review management:</strong> replies to new reviews drafted for your approval, plus a
            monthly summary of what users praise and complain about.
          </li>
          <li>
            <strong>Competitor monitoring:</strong> alerts when the competitors we agree with you change
            their listing, gain keywords, or launch something new.
          </li>
          <li>
            <strong>Listing &amp; content updates:</strong> promotional text, in-app event copy, and
            seasonal listing changes, written and shipped.
          </li>
          <li>
            <strong>Reporting:</strong> a monthly report on rankings, conversion, tests, and ad performance,
            and a 30-minute monthly review call.
          </li>
          <li>
            <strong>Weekly strategy in Slack:</strong> a weekly update in a shared Slack channel on what
            worked and what we will do next.
          </li>
          <li>
            <strong>Quarterly planning:</strong> a competitor and category benchmark, a check of
            localization and new market opportunities, and an updated growth plan, once per quarter of
            continuous Retainer service.
          </li>
        </ul>
        <p>
          Monthly work does not roll over. If a monthly item is not used, for example because you did not
          approve it in time, it does not carry into the next month or entitle you to a refund. Anything
          not listed above is out of scope unless we agree to it in writing, which may involve an
          additional fee.
        </p>
      </section>

      <section>
        <h2>Term &amp; Cancellation</h2>
        <ul>
          <li>
            The Retainer runs month to month, with no minimum term. Each billing month starts on your start
            date, or on the same day of each following month.
          </li>
          <li>
            You may cancel at any time by emailing us at{" "}
            <a href="mailto:hello@appaso.io">hello@appaso.io</a>. To avoid the next charge, your notice
            must reach us before your next billing date.
          </li>
          <li>
            When you cancel, the Retainer continues until the end of the billing month you have already
            paid for, and then ends. We do not refund partial months.
          </li>
        </ul>
        <p>
          We may end the Retainer with 30 days&apos; written notice, or straight away if you materially
          breach these Retainer Terms and do not fix the breach within 14 days of notice. If we end the
          Retainer without cause, we will refund the fees you have paid in proportion to the days remaining
          in the current billing month.
        </p>
      </section>

      <section>
        <h2>Fees and Payment</h2>
        <p>
          Your fee is the monthly rate stated in your proposal. It is billed in advance at the start of
          each billing month. We start work once the first payment is received.
        </p>
        <p>
          A proposal is valid until the expiry date stated in it. If you want to start after that date, we
          will send you an updated proposal.
        </p>
        <p>
          If a payment is more than 7 days late, we may pause work until it is paid, and the pause does not
          extend the billing month. We may change the monthly rate with at least 30 days&apos; written
          notice. The new rate applies from your first billing date after the notice period, and you may
          cancel before then.
        </p>
        <p>
          Fees exclude taxes, which you are responsible for where applicable. Fees are non-refundable once
          paid, except as described in these Retainer Terms or where required by law.
        </p>
      </section>

      <section>
        <h2>Ad Accounts and Spend</h2>
        <p>
          The Retainer fee covers our work only. Advertising spend on Meta Ads and Apple Search Ads is
          billed separately and paid by you directly to the platform, through ad accounts you own. For ad
          management:
        </p>
        <ul>
          <li>
            You own your ad accounts, campaigns, pixels, audiences, and data. We work in them through user
            access you grant, and we never move them into accounts we own.
          </li>
          <li>
            We agree a monthly budget with you. We will not exceed it, or increase spend on a campaign
            beyond it, without your approval.
          </li>
          <li>
            We may adjust bids, targeting, creatives, and the split of budget between campaigns within the
            agreed budget, without asking first.
          </li>
          <li>
            Ad platforms may reject ads, limit delivery, or restrict accounts under their own policies. We
            will work with you to fix any issue we can, but we do not control these decisions.
          </li>
        </ul>
        <p>Any paid tools or other third-party costs are also yours.</p>
      </section>

      <section>
        <h2>Fixing Deliverables</h2>
        <p>
          If you believe a monthly deliverable listed in the Engagement Overview was not provided, notify
          us in writing at <a href="mailto:hello@appaso.io">hello@appaso.io</a> within 7 days of the end
          of that billing month. We will review your concern and fix or deliver the item promptly. If it
          still cannot be delivered, we will credit the value of the undelivered work against your next
          payment, or refund it if the Retainer has ended. This does not apply where the delay was caused
          on your side, as described in Your Responsibilities.
        </p>
      </section>

      <section>
        <h2>Your Responsibilities</h2>
        <p>To keep the work moving each month, you agree to:</p>
        <ul>
          <li>
            Provide timely access to the tools and accounts we need, such as your app store consoles,
            analytics, ad accounts, and creative assets, using roles with the least privilege needed.
          </li>
          <li>Respond to our requests and approvals within a reasonable timeframe, usually 3 working days.</li>
          <li>Name one decision maker who can review and approve changes.</li>
          <li>Approve listing changes, A/B tests, review replies, and ad budgets before they go live.</li>
          <li>Keep your app compliant with App Store, Google Play, and ad platform policies.</li>
        </ul>
        <p>
          Delays on your side may reduce what we can deliver in that month. Billing months are not extended
          while we wait on you, and those delays do not entitle you to a refund or credit.
        </p>
      </section>

      <section>
        <h2>Experiments and Platform Limits</h2>
        <p>
          A/B tests and paid campaigns depend on features and policies of Apple, Google, Meta, and other
          platforms, and on your app&apos;s traffic. Some tests may need more than one month to produce a
          clear result. App review delays, platform outages, or policy changes outside our control may
          affect what can be tested or shipped in a given month.
        </p>
      </section>

      <section>
        <h2>No Results Guarantee</h2>
        <p>
          We do not guarantee any specific level of installs, revenue, rankings, organic visibility, cost
          per install, return on ad spend (ROAS), or other business outcomes. These results depend on
          factors beyond our control, including market conditions, competition, platform algorithms,
          advertising performance, pricing, product quality, and decisions on your side.
        </p>
        <p>
          We do guarantee professional, diligent, and timely execution of the Retainer, including delivery
          of the services listed in the Engagement Overview. Our commitment is to the quality and execution
          of the work, not to a guaranteed business outcome.
        </p>
      </section>

      <section>
        <h2>Ownership of Work</h2>
        <p>
          Once you have paid for the billing month in which we created them, you own the deliverables we
          create specifically for you, including listing copy, ad creatives, store screenshots, test
          results, reports, and plans. You can keep and use them after the Retainer ends, with or without
          us. We keep ownership of our own tools, templates, methods, and know-how, and of AppASO itself.
        </p>
      </section>

      <section>
        <h2>Case Studies &amp; Confidentiality</h2>
        <p>
          We will not publicly disclose, reference, or share any information about you or the Retainer
          without your prior written approval. This includes, but is not limited to:
        </p>
        <ul>
          <li>Your name, company name, logo, or brand.</li>
          <li>Your app name, screenshots, or other identifying materials.</li>
          <li>Campaigns, strategies, methodologies, or performance data.</li>
          <li>Results, insights, metrics, revenue, or other business information.</li>
          <li>Any other information that could identify you or reveal details of the Retainer.</li>
        </ul>
        <p>
          No case studies, testimonials, portfolio materials, marketing content, or public references will
          be created or published without your prior written consent.
        </p>
        <p>
          We will use your non-public information only to deliver the Retainer and will not share it with
          other clients or third parties, except our service providers bound by similar obligations or
          where required by law. When the Retainer ends, we will remove our access to your accounts, and
          you should revoke any access you granted. We will delete or return your confidential information
          on request, except where we must keep it by law.
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
          ADVERTISING SPEND, ARISING FROM THE RETAINER. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF
          THE RETAINER SHALL NOT EXCEED THE RETAINER FEES YOU PAID IN THE THREE MONTHS BEFORE THE CLAIM.
        </p>
      </section>

      <section>
        <h2>Relationship</h2>
        <p>
          AppASO is an independent contractor. Nothing in these Retainer Terms creates an employment,
          partnership, or agency relationship between you and AppASO or its personnel.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>
          We may update these Retainer Terms from time to time by updating the &quot;Last updated&quot;
          date above. We will tell you about material changes at least 30 days before they apply to you.
          They apply from your first billing date after that notice, and you may cancel before then.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          These Retainer Terms are governed by the laws of the State of Delaware, United States, without
          regard to its conflict of law principles, unless otherwise required by applicable local law.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about these Retainer Terms, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
