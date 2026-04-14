import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartStart PM | Modern Property Management",
  description:
    "Enterprise-ready property management from Naples, Florida. Economical per-property pricing, API integrations, migration from legacy PM tools and CSV, with practical AI-assisted workflows.",
  openGraph: {
    title: "SmartStart PM | Modern Property Management",
    description:
      "Light, fast, integration-friendly PM software for portfolios of any size.",
    type: "website",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
