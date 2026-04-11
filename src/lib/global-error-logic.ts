/**
 * Shared logic for `app/global-error.tsx` (kept out of the client component file so
 * devtools/overlays don’t attribute empty-boundary errors to `safeSessionGet` line 1).
 */

export const MAX_AUTO_RETRIES = 3;
export const MAX_SESSION_AUTO_RECOVERIES = 12;
export const SESSION_TOTAL_KEY = "__smartstart_global_err_session_total";
export const LAST_FP_KEY = "__smartstart_ge_last_fp";
export const RETRY_COUNT_KEY = "__smartstart_ge_retry";

/** In-memory fallback when sessionStorage is blocked (Replit iframe / private mode). */
export const geTransientRetry = { fingerprint: "", count: 0 };

export function safeSessionGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(key, value);
  } catch {
    /* Replit / private mode / sandboxed iframe */
  }
}

export function safeSessionRemove(key: string): void {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function fingerprintError(error: unknown): string {
  try {
    if (error == null) return "__null__";
    if (typeof error !== "object") return `v:${String(error).slice(0, 160)}`;
    const e = error as Record<string, unknown>;
    const digest = e.digest;
    if (digest != null && String(digest)) return `d:${String(digest)}`;
    const message = e.message;
    if (message != null && String(message)) return `m:${String(message).slice(0, 160)}`;
    const keys = Object.keys(e).sort().join(",");
    return keys ? `k:${keys}` : "__empty_object__";
  } catch {
    return "__fp_error__";
  }
}

function safeLower(s: unknown): string {
  try {
    if (s == null) return "";
    const t = typeof s === "string" ? s : String(s);
    return t.toLowerCase();
  } catch {
    return "";
  }
}

export function isBareEmptyErrorPayload(error: unknown): boolean {
  if (error == null) return true;
  if (typeof error === "object" && error !== null && Object.keys(error as object).length === 0) {
    return true;
  }
  return false;
}

export function isTransientDevError(error: unknown): boolean {
  try {
    if (error == null) return true;

    if (typeof error === "object" && error !== null && Object.keys(error as object).length === 0) {
      return true;
    }

    const msg = safeLower(
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : undefined
    );
    const stack = safeLower(
      typeof error === "object" && error !== null && "stack" in error
        ? (error as { stack?: unknown }).stack
        : undefined
    );

    if (stack) {
      if (stack.includes("options.factory")) return true;
      if (stack.includes("webpack_require")) return true;
      if (stack.includes("webpack") && msg.includes("reading 'call'")) return true;
      if (stack.includes("chunkloaderror")) return true;
      if (stack.includes("loading chunk")) return true;
      if (stack.includes("hydration")) return true;
      if (stack.includes("mismatch")) return true;
    }

    if (msg) {
      if (
        msg.includes("cannot read properties of undefined") &&
        (msg.includes("reading 'call'") || msg.includes("'call'"))
      ) {
        return true;
      }
      if (msg.includes("hydration")) return true;
      if (msg.includes("server rendered html")) return true;
      if (msg.includes("text content does not match")) return true;
      if (msg.includes("invalid hook call")) return true;
      if (msg.includes("minified react error")) return true;
      if (msg.includes("$refreshreg$")) return true;
      if (msg.includes("dynamically imported module")) return true;
      if (msg.includes("failed to fetch dynamically imported module")) return true;
      if (msg.includes("sessionStorage")) return true;
    }

    return false;
  } catch {
    return true;
  }
}

export function bumpSessionRecoveryTotal(): number {
  try {
    const raw = safeSessionGet(SESSION_TOTAL_KEY);
    const n = parseInt(raw || "0", 10) + 1;
    safeSessionSet(SESSION_TOTAL_KEY, String(n));
    return n;
  } catch {
    return MAX_SESSION_AUTO_RECOVERIES;
  }
}
