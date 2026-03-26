/**
 * Shared translucent “glass” utility classes for dialogs, fields, and popovers.
 * Uses theme tokens so light and dark modes stay consistent.
 */

/** `!` overrides default `bg-background` / `shadow-lg` / `rounded-lg` from `DialogContent`. */
export const glassDialog =
  "!rounded-2xl !border-border/45 !bg-card/40 !shadow-[0_24px_64px_rgba(0,0,0,0.2)] backdrop-blur-2xl ring-1 ring-black/[0.06] dark:!border-white/12 dark:!bg-card/25 dark:!shadow-[0_28px_72px_rgba(0,0,0,0.55)] dark:ring-white/[0.1]";

export const glassField =
  "!border-border/50 !bg-background/35 shadow-none backdrop-blur-md transition-[border-color,background-color,box-shadow] dark:!border-white/15 dark:!bg-background/15";

export const glassInsetRow =
  "!rounded-xl !border-border/45 !bg-muted/15 backdrop-blur-lg dark:!border-white/12 dark:!bg-white/[0.05]";

export const glassSelectContent =
  "!border-border/45 !bg-popover/75 backdrop-blur-xl dark:!border-white/12 dark:!bg-popover/70";

export const glassOutlineButton =
  "!border-border/55 !bg-background/25 backdrop-blur-sm dark:!border-white/18 dark:!bg-background/12";

/** For plain `div`s inside modals. Avoid `Card` here — it adds `dashboard-ui-surface` (opaque global CSS). */
export const glassCard =
  "!rounded-xl !border-border/45 !bg-muted/18 backdrop-blur-xl dark:!border-white/12 dark:!bg-white/[0.06]";
