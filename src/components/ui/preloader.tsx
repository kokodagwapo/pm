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
  showPoweredBy = true,
}: PreloaderProps) {
  const ring = {
    sm: "w-7 h-7 border-[2.5px]",
    md: "w-10 h-10 border-[3px]",
    lg: "w-14 h-14 border-[3.5px]",
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        <div className={cn("rounded-full border-border/30", ring)} />
        <div
          className={cn(
            "absolute inset-0 rounded-full border-transparent border-t-primary animate-spin",
            ring
          )}
        />
      </div>
      {showPoweredBy && (
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground/70 uppercase select-none">
          powered by{" "}
          <span className="text-foreground/60">smartstart.us</span>
        </p>
      )}
    </div>
  );
});

export const FullPagePreloader = memo(function FullPagePreloader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-[3.5px] border-border/20" />
        <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-[6px] rounded-full border-[2.5px] border-transparent border-t-primary/40 animate-spin [animation-duration:1.4s]" />
      </div>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground/60 uppercase select-none">
        powered by{" "}
        <span className="text-foreground/50">smartstart.us</span>
      </p>
    </div>
  );
});

export const PagePreloader = memo(function PagePreloader({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 min-h-[320px] w-full",
        className
      )}
    >
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-border/25" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
      </div>
      <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground/60 uppercase select-none">
        powered by{" "}
        <span className="text-foreground/50">smartstart.us</span>
      </p>
    </div>
  );
});

export const InlinePreloader = memo(function InlinePreloader({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Preloader size={size} showPoweredBy />
    </div>
  );
});

export default Preloader;
