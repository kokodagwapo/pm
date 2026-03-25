"use client";

import { Suspense } from "react";
import { AllInOneStayFinder } from "@/components/stay-finder/AllInOneStayFinder";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";

function StayFinderInner() {
  const { t } = useLocalizationContext();
  return (
    <AllInOneStayFinder
      pathnameBase="/dashboard/properties/stay-finder"
      linkTarget="dashboard"
      crossLinkHref="/all-in-one-calendar"
      crossLinkLabel={t("nav.properties.stayFinderPublicLink")}
      showDashboardHeading
    />
  );
}

export default function DashboardStayFinderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <StayFinderInner />
    </Suspense>
  );
}
