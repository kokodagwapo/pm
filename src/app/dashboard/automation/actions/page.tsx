import { Metadata } from "next";
import LunaActionsPage from "@/components/automation/LunaActionsPage";

export const metadata: Metadata = {
  title: "Autonomous Actions Log | SmartStartPM",
  description:
    "Full reverse-chronological log of every autonomous action taken by Luna, with override and undo controls.",
};

export default function AutomationActionsPage() {
  return <LunaActionsPage />;
}
