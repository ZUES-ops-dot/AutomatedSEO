import type { ReactNode } from "react";
import type { Viewport } from "next";
import { DM_Mono, Syne } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { getSystemQuickStatsData } from "@/features/seo/server/views";

import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-sans"
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono"
});

export const metadata = {
  title: "Qubic SEO Autopilot",
  description:
    "A Qubic-focused SEO command center for audits, suggestions, blog workflows, connector health, and CSV imports."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const stats = await getSystemQuickStatsData();

  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body>
        <AppShell stats={stats}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
