import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "July 6, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <p>
          AppASO (&quot;AppASO&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides a web-based
          App Store Optimization workspace for tracking keyword rankings, optimizing app metadata,
          monitoring reviews, and analyzing competitors on iOS and Android (the &quot;Service&quot;). This
          Privacy Policy explains what information we collect, how we use it, and the choices you have.
        </p>
        <p>
          By using the Service, you agree to the collection and use of information as described in this
          policy. If you do not agree, please do not use the Service.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information</strong> — your email address and password (stored securely by
            our authentication provider), and any name you provide.
          </li>
          <li>
            <strong>Billing information</strong> — if you subscribe to a paid plan, our payment processor
            collects your payment details directly. We do not store full card numbers on our servers.
          </li>
          <li>
            <strong>App and keyword data you submit</strong> — app identifiers, bundle IDs, keywords, and
            related notes you add to the Service in order to track rankings and generate suggestions.
          </li>
          <li>
            <strong>Public app store data</strong> — publicly available metadata, rankings, reviews, and
            listing information retrieved from the Apple App Store and Google Play for apps you or other
            users choose to track or analyze.
          </li>
          <li>
            <strong>Usage data</strong> — log data such as IP address, browser type, pages visited, and
            timestamps, used to operate and secure the Service.
          </li>
          <li>
            <strong>Cookies and similar technologies</strong> — used to keep you signed in and remember
            your preferences. See the Cookies section below.
          </li>
        </ul>
      </section>

      <section>
        <h2>How We Use Information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service, including keyword tracking and AI-assisted suggestions.</li>
          <li>To create and manage your account and authenticate you.</li>
          <li>To process subscription payments and manage billing.</li>
          <li>To send transactional emails, such as sign-up confirmations and password resets.</li>
          <li>To monitor, secure, and troubleshoot the Service, and prevent abuse.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2>Third-Party Service Providers</h2>
        <p>We rely on the following third parties to operate the Service. Each processes data only as needed to perform their function for us:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting for account and app data.</li>
          <li><strong>Stripe</strong> — payment processing for paid subscriptions.</li>
          <li><strong>Mailgun</strong> — delivery of transactional emails (e.g. account verification, password resets).</li>
        </ul>
        <p>
          AI-assisted keyword and metadata suggestions are generated using a self-hosted language model that
          we operate ourselves; the content you submit for these suggestions is not shared with third-party AI
          vendors.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use essential cookies to keep you signed in and maintain your session. These cookies are
          required for the Service to function and cannot be disabled without losing access to your account.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We retain account and app data for as long as your account is active. If you delete your account,
          we will delete or anonymize your personal data within a reasonable period, except where retention
          is required for legal, billing, or security purposes.
        </p>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>
          We use industry-standard technical and organizational measures to protect your information,
          including encryption in transit and access controls. No method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct, export, or delete your
          personal information. You can update most account information directly in the Service, or contact
          us using the details below to make a request.
        </p>
      </section>

      <section>
        <h2>Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to individuals under 16, and we do not knowingly collect personal
          information from children.
        </p>
      </section>

      <section>
        <h2>International Data Transfers</h2>
        <p>
          Your information may be processed and stored in countries other than your own. By using the
          Service, you consent to the transfer of your information to these locations.
        </p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will update
          the &quot;Last updated&quot; date above and, where appropriate, notify you.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your data, contact us at{" "}
          <a href="mailto:hello@appaso.io">hello@appaso.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
