import type { ReactNode } from "react";
import MaintenancePage from "@/components/MaintenancePage";
// @ts-ignore: Allow side-effect CSS import without type declarations
import "./globals.css";

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

export const metadata = {
  title: "AppASO",
  description: "AppASO - Free ASO for your app, rank your mobile app higher and faster.",
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
      </body>
    </html>
  );
}
