"use client";

import dynamic from "next/dynamic";

export const LunaWidgetShell = dynamic(
  () => import("@/components/landing/LunaWidget").then((mod) => mod.LunaWidget),
  { ssr: false }
);
