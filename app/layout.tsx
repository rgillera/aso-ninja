import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import MaintenancePage from "@/components/MaintenancePage";
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

// Only load the tawk.to chat widget on the live production deployment, never
// in local dev or Vercel preview builds (which also set NODE_ENV=production).
const isLiveProduction =
  process.env.VERCEL_ENV === "production" ||
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AppASO - Free ASO Tool",
    template: "%s | AppASO",
  },
  description:
    "Free ASO for your app. Track keyword rankings, optimize metadata, monitor reviews, and analyze competitors for iOS and Android in one workspace.",
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
    "aso for apps"
  ],
  authors: [{ name: "AppASO" }],
  creator: "AppASO",
  publisher: "AppASO",
  alternates: {
    canonical: "/",
  },
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
    url: "/",
    siteName: "AppASO",
    title: "AppASO - Free ASO Tool",
    description:
      "Free ASO for your app. Track keyword rankings, optimize metadata, monitor reviews, and analyze competitors for iOS and Android in one workspace.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppASO - Free ASO Tool",
    description:
      "Free ASO for your app. Track keyword rankings, optimize metadata, monitor reviews, and analyze competitors for iOS and Android in one workspace.",
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
    >
      <body className="min-h-full flex flex-col">
        {maintenanceEnabled ? <MaintenancePage /> : children}
        {isLiveProduction ? (
          <Script id="tawk-to" strategy="lazyOnload">
            {`
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/6a4bc937e9d50b1d4f4058d3/1jss0k0et';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
