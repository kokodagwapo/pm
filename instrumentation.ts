/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Node.js server process starts.
 * Used to initialize the Luna background scheduler.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startLunaScheduler } = await import("@/lib/luna-scheduler");
    startLunaScheduler();
  }
}
