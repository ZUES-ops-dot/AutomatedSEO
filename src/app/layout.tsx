import type { ReactNode } from "react";
import { DM_Mono, Syne } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { canRunPrivilegedUiActions } from "@/features/seo/server/env";
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

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const stats = await getSystemQuickStatsData();
  const privilegedActionsEnabled = canRunPrivilegedUiActions();

  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body>
        <AppShell stats={stats} privilegedActionsEnabled={privilegedActionsEnabled}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
