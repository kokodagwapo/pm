"use client";

import { Bot } from "lucide-react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { LunaAutomationSettings } from "@/components/settings/luna-automation-settings";

export default function AutomationSettingsPage() {
  return (
    <SettingsLayout
      title="Luna Automation"
      description="Configure autonomous AI operations mode, confidence thresholds, spending limits, and digest notifications."
      icon={Bot}
      section="automation"
      adminOnly={true}
    >
      {({ onAlert }) => <LunaAutomationSettings onAlert={onAlert} />}
    </SettingsLayout>
  );
}
