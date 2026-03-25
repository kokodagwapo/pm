"use client";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { AllInOneStayFinder } from "@/components/stay-finder/AllInOneStayFinder";

export function AllInOneCalendarClient() {
  return (
    <>
      <LandingHeader />
      <div className="pt-[calc(3rem+env(safe-area-inset-top))]">
        <AllInOneStayFinder
          pathnameBase="/all-in-one-calendar"
          linkTarget="public"
          crossLinkHref="/auth/signin"
          crossLinkLabel="Manager login"
          contentClassName="px-4 sm:px-6 lg:px-8"
        />
      </div>
    </>
  );
}
