"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function getErrorInfo(error: Error) {
  const message = (error?.message || "").toLowerCase();

  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return {
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection and try again.",
    };
  }
  if (message.includes("unauthorized") || message.includes("authentication")) {
    return {
      title: "Authentication Error",
      description: "Your session may have expired. Please sign in again.",
    };
  }
  if (message.includes("database") || message.includes("mongo")) {
    return {
      title: "Database Error",
      description: "We're having trouble accessing the database. This is usually temporary.",
    };
  }
  return {
    title: "Something Went Wrong",
    description: error.message || "An unexpected error occurred while processing your request.",
  };
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();
  const errorInfo = getErrorInfo(error);

  if (!error?.message) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-lg w-full border-border/60 shadow-xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <AlertCircle className="size-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{errorInfo.title}</h1>
            <p className="text-muted-foreground">{errorInfo.description}</p>
          </div>

          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              Try refreshing the page or going back to the previous page.
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === "development" && error.message && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border text-xs space-y-2">
                <div>
                  <span className="font-semibold">Message: </span>
                  <code className="bg-background px-2 py-1 rounded">{error.message}</code>
                </div>
                {error.stack && (
                  <pre className="mt-2 p-3 bg-background rounded overflow-auto max-h-48 border border-border">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => reset()} className="gap-2">
              <RefreshCw className="size-4" />
              Try Again
            </Button>
            <Button onClick={() => router.back()} variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Go Back
            </Button>
            <Button onClick={() => router.push("/")} variant="outline" className="gap-2">
              <Home className="size-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
