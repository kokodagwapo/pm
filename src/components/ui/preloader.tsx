"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface PreloaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showPoweredBy?: boolean;
}

export const Preloader = memo(function Preloader({ 
  className, 
  size = "md",
  showPoweredBy = false
}: PreloaderProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      {showPoweredBy && (
        <p className="text-[10px] text-muted-foreground/60 tracking-wide">
          powered by <span className="text-muted-foreground">smartstart.us</span>
        </p>
      )}
    </div>
  );
});

export const FullPagePreloader = memo(function FullPagePreloader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Preloader size="lg" showPoweredBy />
    </div>
  );
});

export const PagePreloader = memo(function PagePreloader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <Preloader size="md" />
    </div>
  );
});

export const InlinePreloader = memo(function InlinePreloader({ 
  size = "sm" 
}: { 
  size?: "sm" | "md" 
}) {
  return (
    <div className="flex items-center justify-center py-6">
      <Preloader size={size} />
    </div>
  );
});

export default Preloader;
