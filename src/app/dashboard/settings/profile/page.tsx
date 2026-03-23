"use client";

import { User } from "lucide-react";
import { useSession } from "next-auth/react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { CreditBuilderWidget } from "@/components/tenant-intelligence/CreditBuilderWidget";

export default function ProfileSettingsPage() {
  const { t } = useLocalizationContext();
  const { data: session } = useSession();
  const isTenant = (session?.user as { role?: string })?.role === "tenant";

  return (
    <SettingsLayout
      title={t("settings.profile.pageTitle")}
      description={t("settings.profile.pageDescription")}
      icon={User}
      section="profile"
      showRefresh={true}
    >
      {({ userProfile, onUpdate, onAlert }) => (
        <div className="space-y-6">
          <ProfileSettings
            user={userProfile}
            onUpdate={onUpdate}
            onAlert={onAlert}
          />
          {isTenant && <CreditBuilderWidget />}
        </div>
      )}
    </SettingsLayout>
  );
}
