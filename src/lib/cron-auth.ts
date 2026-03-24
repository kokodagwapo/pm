/**
 * Shared cron authentication.
 * Accepts Authorization: Bearer <secret> or x-cron-secret: <secret> (raw).
 * When any configured secret matches, the request is allowed.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";

const devWarned = { current: false };

export type CronAuthOptions = {
  /** Env var names to read (first non-empty wins for matching — all listed values are accepted). */
  envKeys?: string[];
};

function collectSecrets(envKeys: string[]): string[] {
  const out: string[] = [];
  for (const key of envKeys) {
    const v = process.env[key]?.trim();
    if (v) out.push(v);
  }
  return out;
}

/**
 * @returns null if authorized; otherwise a NextResponse error.
 */
export function verifyCronRequest(
  request: Request,
  opts?: CronAuthOptions
): NextResponse | null {
  const envKeys = opts?.envKeys?.length
    ? opts.envKeys
    : ["CRON_SECRET"];
  const secrets = collectSecrets(envKeys);

  if (secrets.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Cron authentication not configured (set CRON_SECRET or the relevant secret env var)",
        },
        { status: 500 }
      );
    }
    if (!devWarned.current) {
      devWarned.current = true;
      console.warn(
        `[cron-auth] No cron secret configured (${envKeys.join(", ")}) — allowing request in non-production`
      );
    }
    return null;
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  const xCron = request.headers.get("x-cron-secret")?.trim();
  const provided = bearer || xCron;

  if (!provided || !secrets.includes(provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Cron secret **or** authenticated admin session (for manual runs in the dashboard).
 */
export async function verifyCronRequestOrAdmin(
  request: NextRequest,
  opts?: CronAuthOptions
): Promise<NextResponse | null> {
  const cronErr = verifyCronRequest(request, opts);
  if (!cronErr) return null;

  const session = await auth();
  if (session?.user?.role === UserRole.ADMIN) return null;

  return cronErr;
}
