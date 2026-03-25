"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft } from "lucide-react";
import { EnhancedPropertyForm } from "@/components/properties/PropertyForm";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { cn } from "@/lib/utils";
import {
  showErrorToast,
  showSimpleError,
  showSimpleSuccess,
  parseValidationErrors,
} from "@/lib/toast-notifications";

export default function EnhancedNewPropertyPage() {
  const router = useRouter();
  const { t } = useLocalizationContext();
  const [isLoading, setIsLoading] = useState(false);

  const handlePropertySubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract detailed error information from various possible response formats
        const errorDetails = result.details || result.error || result.message;
        const errorMessage =
          typeof errorDetails === "string"
            ? errorDetails
            : Array.isArray(errorDetails)
            ? errorDetails.join(", ")
            : JSON.stringify(errorDetails);

        throw new Error(errorMessage || "Failed to create property");
      }

      // The API returns data in result.data
      const property = result.data;
      showSimpleSuccess(
        t("properties.newProperty.success.title"),
        t("properties.newProperty.success.description", {
          values: { name: data.name },
        })
      );

      // Redirect to property details page
      router.push(`/dashboard/properties/${property._id}`);
    } catch (error) {
      console.error("Property creation error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : t("properties.newProperty.error.fallbackMessage");

      // Parse validation errors for better display
      const parsedErrors = parseValidationErrors(errorMessage);

      // If we have multiple errors or errors with field info, show detailed toast
      if (parsedErrors.length > 1 || parsedErrors.some((e) => e.field)) {
        showErrorToast({
          title: t("properties.newProperty.error.title"),
          description: `${parsedErrors.length} validation ${
            parsedErrors.length === 1 ? "error" : "errors"
          } found`,
          items: parsedErrors,
        });
      } else {
        // For single simple errors, show a simple error toast
        showSimpleError(
          t("properties.newProperty.error.title"),
          errorMessage
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-full space-y-8 pb-10 pt-1 sm:pb-12 sm:pt-0">
      <header
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white",
          "shadow-[0_1px_0_rgba(0,0,0,0.03),0_10px_28px_-14px_rgba(15,23,42,0.1)]",
          "dark:border-white/[0.08] dark:bg-gray-950/70 dark:shadow-none"
        )}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/[0.06]">
          <Button
            variant="outline"
            size="sm"
            asChild
            className={cn(
              "h-9 w-fit rounded-lg border-slate-200/90 bg-white px-3 text-black shadow-none",
              "hover:border-slate-300 hover:bg-slate-50 hover:text-black",
              "dark:border-white/15 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:bg-white/10"
            )}
          >
            <Link href="/dashboard/properties">
              <ArrowLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              {t("properties.newProperty.backToList")}
            </Link>
          </Button>
        </div>

        <div className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90",
                "bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100"
              )}
              aria-hidden
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-black sm:text-[1.65rem] dark:text-white">
                {t("properties.newProperty.title")}
              </h1>
              <p className="max-w-2xl text-pretty text-sm leading-relaxed text-black/70 sm:text-[15px] dark:text-gray-400">
                {t("properties.newProperty.subtitle")}
              </p>
              <div
                className={cn(
                  "max-w-2xl rounded-lg border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5",
                  "dark:border-white/10 dark:bg-white/[0.03]"
                )}
              >
                <p className="text-pretty text-xs leading-relaxed text-black/60 sm:text-[13px] dark:text-gray-500">
                  {t("properties.newProperty.hint")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <EnhancedPropertyForm
          onSubmit={handlePropertySubmit}
          isLoading={isLoading}
          mode="create"
        />
      </div>
    </div>
  );
}
