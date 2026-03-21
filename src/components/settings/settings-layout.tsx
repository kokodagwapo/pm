"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/types";
import { logClientError, logClientWarn } from "@/utils/logger";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

interface UserSettings {
  _id: string;
  userId: string;
  notifications: any;
  security: any;
  display: any;
  privacy: any;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  avatar?: string;
  bio?: string;
  location?: string;
  city?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsLayoutProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children:
    | ReactNode
    | ((props: {
        userSettings: UserSettings | null;
        userProfile: UserProfile | null;
        onUpdate: (data: any) => Promise<void>;
        onAlert: (type: "success" | "error" | "info", message: string) => void;
        isLoading: boolean;
      }) => ReactNode);
  section: string;
  showRefresh?: boolean;
  adminOnly?: boolean;
}

export function SettingsLayout({
  title,
  description,
  icon: Icon,
  children,
  section,
  showRefresh = false,
  adminOnly = false,
}: SettingsLayoutProps) {
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const { data: session, status } = useSession({
    refetchOnWindowFocus: false,
    refetchWhenOffline: false,
    refetchInterval: 0,
  });
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const userRole = session?.user?.role as UserRole;
  const isAdmin = userRole === UserRole.ADMIN;
  const isManager = userRole === UserRole.MANAGER;
  const hasAdminAccess = isAdmin || isManager;

  useEffect(() => {
    // Only fetch data when session is loaded and authenticated
    if (status === "authenticated" && session?.user?.id) {
      if (adminOnly && !hasAdminAccess) {
        setIsLoading(false);
        return;
      }
      fetchUserData();
      setAlert(null);
    } else if (status === "unauthenticated") {
      setIsLoading(false);
      showAlert("error", "Authentication required");
    }
  }, [session, status, adminOnly, hasAdminAccess]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);

      // Check if user is authenticated
      if (!session?.user?.id) {
        throw new Error("Authentication required");
      }

      // For profile section, we need to merge user profile data with profile settings
      if (section === "profile") {
        try {
          // Start with session data as fallback
          let mergedUserData = session?.user ? { ...session.user } : null;

          // Try to fetch user profile data
          try {
            const profileResponse = await fetch("/api/user/profile", {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
              },
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.user) {
                mergedUserData = { ...profileData.user };
              }
            }
          } catch (profileError) {
            logClientWarn("Failed to fetch user profile:", profileError);
          }

          // Try to fetch profile settings and merge if they exist
          try {
            const settingsResponse = await fetch("/api/settings/profile", {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
              },
            });

            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              const profileSettings =
                settingsData?.data?.settings || settingsData?.settings;

              if (profileSettings && mergedUserData) {
                // Merge profile settings into user data, giving priority to profile settings for extended fields
                // but preserving critical user data like avatar, email, role, etc.
                mergedUserData = {
                  ...mergedUserData,
                  ...profileSettings,
                  // Always keep the original user ID, email, role, and avatar from user profile
                  _id: mergedUserData._id || mergedUserData.id,
                  email: mergedUserData.email,
                  role: mergedUserData.role,
                  isActive: mergedUserData.isActive,
                  avatar: mergedUserData.avatar, // Preserve avatar from user profile
                  image: mergedUserData.image, // Preserve image from user profile
                  createdAt: mergedUserData.createdAt,
                  updatedAt: mergedUserData.updatedAt,
                };
              }
            }
          } catch (settingsError) {
            logClientWarn("Failed to fetch profile settings:", settingsError);
          }

          // Ensure we have some user data
          if (!mergedUserData && session?.user) {
            mergedUserData = { ...session.user };
          }

          setUserProfile(mergedUserData);
          setUserSettings({ profile: mergedUserData });
        } catch (profileError) {
          logClientError("Profile section error:", profileError);
          // Fallback to session data
          if (session?.user) {
            setUserProfile({ ...session.user });
            setUserSettings({ profile: { ...session.user } });
          } else {
            throw profileError;
          }
        }
      } else {
        // For other sections, fetch user profile and section-specific settings separately
        const profileResponse = await fetch("/api/user/profile", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileResponse.json();
        setUserProfile(profileData.user);

        // Fetch section-specific settings using the new separate endpoints
        let settingsData = null;
        try {
          let settingsEndpoint = "/api/settings/user"; // fallback to unified settings

          // Use specific endpoints for new architecture
          switch (section) {
            case "display":
              settingsEndpoint = "/api/settings/display";
              break;
            case "notifications":
              settingsEndpoint = "/api/settings/notifications";
              break;
            case "security":
              settingsEndpoint = "/api/settings/security";
              break;
            case "privacy":
              settingsEndpoint = "/api/settings/privacy";
              break;
            case "system":
              settingsEndpoint = "/api/settings/system";
              break;
          }

          const settingsResponse = await fetch(settingsEndpoint, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          if (settingsResponse.ok) {
            const payload = await settingsResponse.json();

            // Normalize common API response shapes
            const normalized = payload?.data ?? payload; // our helpers wrap under data

            // Handle different response structures
            if (
              section === "display" ||
              section === "notifications" ||
              section === "security" ||
              section === "privacy" ||
              section === "system"
            ) {
              // Separate endpoints often return { success, data: { settings } }
              const value =
                normalized?.settings ?? normalized?.[section] ?? normalized;
              settingsData = { [section]: value };
            } else {
              // Unified endpoint returns nested structure
              settingsData = normalized?.settings ?? normalized;
            }
          }
        } catch (error) {
          logClientWarn(
            `Failed to fetch ${section} settings, falling back to unified endpoint:`,
            error
          );

          // Fallback to unified settings endpoint
          try {
            const fallbackResponse = await fetch("/api/settings/user", {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
              },
            });

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              settingsData = fallbackData.settings;
            }
          } catch (fallbackError) {
            logClientError("Fallback settings fetch failed:", fallbackError);
          }
        }

        if (settingsData) {
          setUserSettings(settingsData);
        }
      }
    } catch (error) {
      logClientError("Fetch user data error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load user data";
      showAlert("error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    if (type === "success") {
      toast.success(message);
      setAlert(null);
      return;
    } else if (type === "error") {
      toast.error(message);
    } else {
      toast(message);
    }

    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const clearAlert = () => {
    setAlert(null);
  };

  const handleSettingsUpdate = async (data: any) => {
    // Update local state optimistically without causing form reload
    if (section === "profile" && userProfile) {
      const updatedProfile = {
        ...userProfile,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(updatedProfile);
      setUserSettings({ profile: updatedProfile });
    } else if (userSettings) {
      // For other settings, update the specific section without full reload
      setUserSettings((prevSettings) => ({
        ...prevSettings,
        [section]: {
          ...prevSettings?.[section as keyof UserSettings],
          ...data,
        },
        updatedAt: new Date().toISOString(),
      }));
    }

    // Show success message but don't trigger form reload
    showAlert("success", `Settings updated successfully`);

    // No need to refetch - optimistic updates are sufficient
    // The form components handle their own state management
  };

  if (isLoading || status === "loading") {
    return (
      <div
        className={cn(
          "flex min-h-[40vh] items-center justify-center",
          isLight && "text-slate-900"
        )}
      >
        <div
          className={cn(
            "h-8 w-8 animate-spin rounded-full",
            isLight
              ? "border-2 border-slate-200 border-t-sky-600"
              : "border-b-2 border-primary"
          )}
          aria-hidden
        />
      </div>
    );
  }

  if (adminOnly && !hasAdminAccess) {
    return (
      <div
        className={cn(
          "container mx-auto max-w-6xl p-6",
          isLight && "text-slate-900"
        )}
      >
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. This section is only available to administrators and
            managers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "container mx-auto max-w-6xl p-6",
        isLight && "text-slate-900"
      )}
    >
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <SettingsIcon
            className={cn(
              "h-8 w-8 shrink-0",
              isLight ? "text-sky-600" : "text-primary"
            )}
          />
          <h1
            className={cn(
              "text-3xl font-bold",
              isLight ? "text-slate-900" : "text-white"
            )}
          >
            {t("settings.pageTitle")}
          </h1>
        </div>
        <p
          className={cn(
            isLight ? "text-slate-600" : "text-white/75"
          )}
        >
          {t("settings.pageDescription")}
        </p>
      </div>

      <Card
        className={cn(
          isLight && "border-slate-200/90 text-slate-900 shadow-sm"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(
              "flex items-center justify-between gap-2",
              isLight && "text-slate-900 [&_svg]:text-slate-700"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 shrink-0" />
              {title}
            </div>
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUserData}
                disabled={isLoading}
                className={cn(
                  "text-xs",
                  isLight &&
                    "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                )}
              >
                <RefreshCw
                  className={`mr-1 h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                />
                {t("settings.refreshButton")}
              </Button>
            )}
          </CardTitle>
          <CardDescription
            className={cn(isLight ? "text-slate-600" : "text-white/70")}
          >
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alert && (
            <Alert
              className={`mb-4 ${
                alert.type === "success"
                  ? "border-green-500 bg-green-50"
                  : alert.type === "error"
                  ? "border-red-500 bg-red-50"
                  : "border-blue-500 bg-blue-50"
              }`}
            >
              {alert.type === "success" && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {alert.type === "error" && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              {alert.type === "info" && (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription
                className={`flex items-center justify-between ${
                  alert.type === "success"
                    ? "text-green-800"
                    : alert.type === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                <span>{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAlert}
                  className={cn(
                    "ml-2 h-6 w-6 p-0",
                    isLight && "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Pass data and handlers to children */}
          {typeof children === "function"
            ? children({
                userSettings,
                userProfile: userProfile || session?.user || null,
                onUpdate: handleSettingsUpdate,
                onAlert: showAlert,
                isLoading,
              })
            : children}
        </CardContent>
      </Card>
    </div>
  );
}
