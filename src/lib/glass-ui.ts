/**
 * Shared translucent “glass” utility classes for dialogs, fields, and popovers.
 * Uses theme tokens so light and dark modes stay consistent.
 */

export const glassDialog =
  "border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.04] dark:bg-card/45 dark:shadow-[0_24px_64px_rgba(0,0,0,0.45)] dark:ring-white/[0.08]";

export const glassField =
  "border-border/55 bg-background/45 shadow-none backdrop-blur-md transition-[border-color,background-color,box-shadow] dark:border-white/12 dark:bg-background/25";

export const glassInsetRow =
  "rounded-xl border border-border/50 bg-muted/25 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]";

export const glassSelectContent =
  "border-border/50 bg-popover/85 backdrop-blur-xl dark:border-white/10 dark:bg-popover/80";

export const glassOutlineButton =
  "border-border/60 bg-background/30 backdrop-blur-sm dark:border-white/15 dark:bg-background/20";

export const glassCard =
  "border-border/50 bg-muted/30 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]";
