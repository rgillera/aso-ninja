import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: {
    canonical: "/terms",
  },
};

const LAST_UPDATED = "July 6, 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of AppASO
          (&quot;AppASO&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), a web-based App Store
          Optimization workspace for tracking keyword rankings, optimizing app metadata, monitoring
          reviews, and analyzing competitors on iOS and Android (the &quot;Service&quot;). By creating an
          account or otherwise using the Service, you agree to be bound by these Terms.
        </p>
      </section>

      <section>
        <h2>Eligibility</h2>
        <p>
          You must be at least 16 years old and able to form a binding contract to use the Service. By
          using the Service, you represent that you meet these requirements.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. Notify us immediately at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a> if you suspect unauthorized use of your
          account.
        </p>
      </section>

      <section>
        <h2>Subscriptions and Billing</h2>
        <p>
          The Service offers both free and paid subscription plans. Paid plans are billed in advance on a
          recurring basis through our payment processor. By subscribing to a paid plan, you authorize us to
          charge the applicable fees to your chosen payment method.
        </p>
        <p>
          Unless otherwise stated, fees are non-refundable. You may cancel your subscription at any time;
          cancellation takes effect at the end of the current billing period, and you will retain access to
          paid features until then. We may change our prices with reasonable advance notice.
        </p>
      </section>

      <section>
        <h2>Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service to violate any applicable law or third-party right.</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service, including through excessive automated requests.</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except as permitted by law.</li>
          <li>Resell, sublicense, or provide the Service to third parties as a standalone competing product without our written consent.</li>
        </ul>
      </section>

      <section>
        <h2>Your Content</h2>
        <p>
          You retain ownership of any app data, keywords, and notes you submit to the Service
          (&quot;Your Content&quot;). You grant us a limited license to use Your Content solely to operate
          and provide the Service to you, including generating keyword rankings, metadata suggestions, and
          competitor analysis.
        </p>
        <p>
          You are responsible for ensuring Your Content does not infringe on the rights of others or
          violate applicable law.
        </p>
      </section>

      <section>
        <h2>Third-Party Data</h2>
        <p>
          The Service displays publicly available data from the Apple App Store and Google Play, such as
          rankings, reviews, and listing metadata. This data is provided &quot;as is&quot;, may not always
          be accurate or up to date, and is not owned or controlled by us.
        </p>
      </section>

      <section>
        <h2>Intellectual Property</h2>
        <p>
          The Service, including its design, features, and underlying software, is owned by AppASO and
          protected by intellectual property laws. These Terms do not grant you any rights to our
          trademarks, logos, or branding.
        </p>
      </section>

      <section>
        <h2>Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
          KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT KEYWORD RANKINGS, VOLUME
          ESTIMATES, OR AI-GENERATED SUGGESTIONS WILL BE ACCURATE OR RESULT IN IMPROVED APP PERFORMANCE.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPASO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, OR DATA, ARISING
          FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS SHALL
          NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate
          your access to the Service if you violate these Terms or if we discontinue the Service, with
          notice where reasonably practicable.
        </p>
      </section>

      <section>
        <h2>Changes to the Service or Terms</h2>
        <p>
          We may modify or discontinue features of the Service at any time. We may also update these Terms
          from time to time; if we make material changes, we will update the &quot;Last updated&quot; date
          above and, where appropriate, notify you. Continued use of the Service after changes take effect
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, United States, without regard to
          its conflict of law principles, unless otherwise required by applicable local law.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about these Terms, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
