import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import MaintenancePage from "@/components/MaintenancePage";
import { siteDescription, siteTitle } from "@/libs/seo";
// @ts-ignore: Allow side-effect CSS import without type declarations
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";

// Fonts are loaded via CSS (globals.css). The next/font/google module may not
// be available in this environment, so provide fallback objects with the
// same shape used below.

const Geist = (opts: { variable: string; subsets?: string[] }) => ({
  variable: opts.variable,
});
const Geist_Mono = (opts: { variable: string; subsets?: string[] }) => ({
  variable: opts.variable,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const maintenanceEnabled =
  process.env.MAINTENANCE_MODE === "1" ||
  process.env.MAINTENANCE_MODE?.toLowerCase() === "true";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | AppASO",
  },
  description: siteDescription,
  applicationName: "AppASO",
  keywords: [
    "aso",
    "app store optimization",
    "keyword tracking",
    "App Store rankings",
    "Google Play rankings",
    "mobile app marketing",
    "mobile aso tool",
    "app metadata optimization",
    "ASO tool",
    "app store analytics",
    "app store insights",
    "app store performance",
    "app store optimization software",
    "app aso",
    "aso for apps",
    "free aso tool",
    "aso tool for android",
    "aso tool for ios",
  ],
  authors: [{ name: "AppASO" }],
  creator: "AppASO",
  publisher: "AppASO",
  // No site-wide `alternates.canonical` or `openGraph.url` here: metadata merges
  // shallowly, so every page that doesn't set its own would inherit "/" and
  // tell search engines it's a duplicate of the homepage.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "AppASO",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The dashboard's theme toggle (features/dashboard/ThemeContext.tsx) sets
      // data-theme on this element out of band — via a synchronous inline
      // script (app/dashboard/layout.tsx) before hydration, and via a plain
      // DOM call afterward — specifically so a light-mode session (the
      // product default) never flashes the CSS's built-in dark styling.
      // Both intentionally run before/outside
      // React's own render of this node, so React's hydration diff always
      // sees an attribute here it didn't itself produce; suppressed rather
      // than "fixed" since there's no server-rendered value that could ever
      // match a client-only preference read from a cookie set on this same
      // request. Scoped to just this element's own attributes — everything
      // else still gets normal hydration mismatch warnings.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {maintenanceEnabled ? <MaintenancePage /> : children}
        <Analytics />
      </body>
    </html>
  );
}
