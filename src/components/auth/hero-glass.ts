import { cn } from "@/lib/utils";

/**
 * Frosted glass tokens for auth screens over HeroVideo — aligned with dashboard cyan/slate glass.
 */
export const heroGlassPanel = cn(
  "rounded-2xl border border-white/[0.14] bg-white/[0.07] p-6 text-white/90 shadow-[0_12px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-[1.35]",
  "[box-shadow:0_12px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]",
  "transition-[border-color,background-color,box-shadow] duration-300",
  "hover:border-white/[0.2] hover:bg-white/[0.09]"
);

export const heroGlassInput = cn(
  "w-full min-h-[42px] rounded-xl border border-white/[0.18] bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md backdrop-saturate-125",
  "placeholder:text-white/40 touch-manipulation",
  "transition-[border-color,background-color,box-shadow] duration-200",
  "focus:border-cyan-400/45 focus:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
);

export const heroGlassInset = cn(
  "rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-3 backdrop-blur-md backdrop-saturate-125",
  "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.05)]"
);

export const heroGlassButtonPrimary = cn(
  "w-full min-h-[42px] rounded-xl border border-white/[0.22] bg-white/[0.12] py-2.5 text-sm tracking-wide text-white",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md backdrop-saturate-125",
  "transition-[border-color,background-color] duration-200",
  "hover:border-white/[0.3] hover:bg-white/[0.18]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30",
  "disabled:pointer-events-none disabled:opacity-55"
);
