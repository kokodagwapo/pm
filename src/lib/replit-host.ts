/**
 * Detect Replit preview / deploy hosts (client-only checks).
 * Used for transient error recovery (webpack chunk races) where behavior matches dev.
 */
export function isReplitHosted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const h = window.location.hostname;
    return (
      h.endsWith(".replit.dev") ||
      h.endsWith(".replit.app") ||
      h.endsWith(".repl.co")
    );
  } catch {
    return false;
  }
}
