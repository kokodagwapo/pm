"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
  Shield,
  Database,
  Wifi,
  MessageSquare,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function getErrorContext(error: Error) {
  const message = (error?.message || "").toLowerCase();

  if (message.includes("unauthorized") || message.includes("session")) {
    return {
      icon: Shield,
      title: "Session Expired",
      description: "Your session has expired or you're not authorized to access this dashboard.",
      action: "Please sign in again to continue.",
    };
  }
  if (message.includes("network") || message.includes("fetch")) {
    return {
      icon: Wifi,
      title: "Connection Issue",
      description: "Unable to load dashboard data due to a network error.",
      action: "Check your connection and try again.",
    };
  }
  if (message.includes("database") || message.includes("data")) {
    return {
      icon: Database,
      title: "Data Loading Error",
      description: "We're having trouble loading your dashboard data.",
      action: "This is usually temporary. Please try again.",
    };
  }
  return {
    icon: AlertCircle,
    title: "Dashboard Error",
    description: "An unexpected error occurred while loading your dashboard.",
    action: "Try refreshing the page or contact support if the issue persists.",
  };
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const router = useRouter();
  const errorContext = getErrorContext(error);
  const ErrorIcon = errorContext.icon;

  if (!error?.message) {
    return null;
  }

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-2xl w-full border-border/60 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <ErrorIcon className="size-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold">
            {errorContext.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription className="mt-2">
              {errorContext.description}
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{errorContext.action}</p>
          </div>

          {process.env.NODE_ENV === "development" && error.message && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border text-xs space-y-2">
                <div>
                  <span className="font-semibold">Message: </span>
                  <code className="bg-background px-2 py-1 rounded">{error.message}</code>
                </div>
                {error.stack && (
                  <pre className="mt-2 p-3 bg-background rounded overflow-auto max-h-48 border">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => reset()} className="flex-1 gap-2" size="lg">
              <RefreshCw className="size-4" />
              Try Again
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" asChild>
              <a href="mailto:hi@smartstart.us" className="flex gap-2 items-center">
                <MessageSquare className="size-4" />
                Contact Us
              </a>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => router.back()} variant="outline" className="flex-1 gap-2">
              <ArrowLeft className="size-4" />
              Go Back
            </Button>
            <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex-1 gap-2">
              <LayoutDashboard className="size-4" />
              Dashboard Home
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Quick access:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/dashboard/properties">Properties</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/dashboard/tenants">Tenants</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/dashboard/maintenance">Maintenance</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/dashboard/settings">Settings</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
