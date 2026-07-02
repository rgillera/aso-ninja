import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MaintenancePage from "@/components/MaintenancePage";
import "./globals.css";

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
  title: "ASO Ninja",
  description: "ASO Ninja, rank your mobile app higher and faster.",
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
