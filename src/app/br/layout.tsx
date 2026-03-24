import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "SmartStartPM — Competitive advantage & capability matrix",
  description:
    "Compare SmartStartPM to rent-only tools, spreadsheets, legacy PMS, and generic CRMs. Full-stack property operations with Luna AI and compliance-oriented workflows.",
};

export default function BrLayout({ children }: { children: ReactNode }) {
  return children;
}
