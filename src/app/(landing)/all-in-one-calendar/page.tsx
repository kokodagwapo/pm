import type { Metadata } from "next";
import { Suspense } from "react";
import { AllInOneCalendarClient } from "./AllInOneCalendarClient";

export const metadata: Metadata = {
  title: "All-in-one stay calendar | SmartStart PM",
  description:
    "Choose check-in, check-out, and party size — then browse public listings available for your stay.",
  openGraph: {
    title: "All-in-one stay calendar | SmartStart PM",
    description:
      "Vacation-style availability search: dates, guests, and bookable homes in one flow.",
    type: "website",
  },
};

export default function AllInOneCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-[50vh] max-w-6xl animate-pulse rounded-2xl bg-white/30 px-4 py-24" />
      }
    >
      <AllInOneCalendarClient />
    </Suspense>
  );
}
