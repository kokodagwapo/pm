/**
 * SmartStartPM - NextAuth API Route
 * Handles authentication endpoints for the application
 */

import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";

const { GET: nextAuthGET, POST: nextAuthPOST } = handlers;

function isMongoishError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("mongo") ||
    msg.includes("database") ||
    msg.includes("mongoserver") ||
    msg.includes("mongodb_uri")
  );
}

function isAuthSessionPath(pathname: string): boolean {
  return /\/api\/auth\/session\/?$/.test(pathname);
}

export const GET: typeof nextAuthGET = async (...args) => {
  const req = args[0] as Request;
  const path = new URL(req.url).pathname;
  const sessionPath = isAuthSessionPath(path);

  try {
    const res = await nextAuthGET(...args);
    // Auth.js often returns 5xx JSON for adapter/DB failures instead of throwing
    if (sessionPath && res.status >= 500) {
      console.error(
        "[auth] Session GET returned",
        res.status,
        "; treating as unauthenticated (often MongoDB unreachable)"
      );
      return NextResponse.json({});
    }
    return res;
  } catch (e) {
    if (sessionPath && isMongoishError(e)) {
      console.error(
        "[auth] Session GET failed (database); returning unauthenticated session",
        e
      );
      return NextResponse.json({});
    }
    throw e;
  }
};

export const POST = nextAuthPOST;
