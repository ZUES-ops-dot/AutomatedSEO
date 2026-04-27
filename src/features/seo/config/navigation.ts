import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { Files, LayoutDashboard, Link2, PlugZap, Radar, Sparkles } from "lucide-react";

export interface NavigationItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  subtitle: string;
}

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    subtitle: "Measure & cadence"
  },
  {
    href: "/suggestions",
    label: "Suggestions",
    icon: Radar,
    subtitle: "Prioritized queue"
  },
  {
    href: "/generate" as Route,
    label: "Generate",
    icon: Sparkles,
    subtitle: "2500+ word blog + links"
  },
  {
    href: "/blog-links" as Route,
    label: "Blog links",
    icon: Link2,
    subtitle: "Search · crawl · DOCX"
  },
  {
    href: "/imports",
    label: "Imports",
    icon: Files,
    subtitle: "CSV validation"
  },
  {
    href: "/connectors",
    label: "Connectors",
    icon: PlugZap,
    subtitle: "Signals in"
  }
];

export const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Qubic SEO Copilot",
    subtitle: "Monitor the loop: signals feeding the queue, content pipeline, and connector cadence."
  },
  "/suggestions": {
    title: "Suggestions Inbox",
    subtitle: "Prioritized opportunities from search, crawl, and feeds--approve or snooze before production."
  },
  "/generate": {
    title: "Generate Long-Form Article",
    subtitle: "Enter a topic and generate a 2500+ word blog post with embedded internal links. Export as DOCX for review."
  },
  "/blog-links": {
    title: "Blog internal links",
    subtitle:
      "Search crawled posts on qubic.org (blog-detail), generate cross-links to other posts and Qubic properties, and export a DOCX with embedded hyperlinks."
  },
  "/imports": {
    title: "Imports Center",
    subtitle: "Validate CSVs before they seed keywords, URLs, or downstream jobs."
  },
  "/connectors": {
    title: "Connectors",
    subtitle: "Pull Morningscore (keywords + onsite), crawl, RSS, GitHub, and more into one signal layer."
  }
};
