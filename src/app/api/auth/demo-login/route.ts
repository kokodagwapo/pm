/**
 * Demo Login API - Server-side login for environments where client-side
 * signIn() doesn't work (e.g. IDE Simple Browser, embedded webviews).
 *
 * Usage: GET /api/auth/demo-login?role=admin
 * Roles: admin, manager, owner, tenant
 *
 * Approach: Returns an auto-submitting HTML form that POSTs credentials
 * to the NextAuth callback endpoint with proper CSRF token.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEMO_AUTH_ENABLED = process.env.ENABLE_DEMO_AUTH === "true";

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
    admin: { email: "superadmin@smartstartpm.com", password: "Sspm!Super2026" },
    manager: { email: "pmadmin@smartstartpm.com", password: "Sspm!Manager2026" },
    owner: { email: "owner@smartstartpm.com", password: "Sspm!Owner2026" },
    tenant: { email: "tenant@smartstartpm.com", password: "Sspm!Tenant2026" },
};

export async function GET(request: NextRequest) {
    if (!DEMO_AUTH_ENABLED) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = request.nextUrl.searchParams.get("role") || "admin";
    const creds = DEMO_CREDENTIALS[role];

    if (!creds) {
        return NextResponse.json(
            { error: `Unknown role: ${role}. Valid: admin, manager, owner, tenant` },
            { status: 400 }
        );
    }

    // Get the CSRF token from the cookie jar
    const cookieStore = await cookies();
    let csrfToken = "";

    // Prefer the request origin (domain user is actually on) so custom domains (e.g. pm.smarts.fi)
    // work even when NEXTAUTH_URL points to Replit default (smartpm.replit.app).
    const requestOrigin = request.nextUrl.origin;
    const baseUrl =
      requestOrigin && (requestOrigin.startsWith("https://") || requestOrigin.startsWith("http://localhost"))
        ? requestOrigin
        : process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.APP_URL || requestOrigin;
    let setCookieHeader = "";

    try {
        const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
            headers: { cookie: cookieStore.toString() },
        });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken || "";

        // IMPORTANT: We must forward the set-cookie header so the browser 
        // actually stores the CSRF cookie for the subsequent form POST.
        const sc = csrfRes.headers.get("set-cookie");
        if (sc) setCookieHeader = sc;
    } catch {
        // If we can't get CSRF, the form will still try
    }

    // Return an auto-submitting HTML form
    const html = `<!DOCTYPE html>
<html>
<head><title>Logging in...</title></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:white;font-family:system-ui">
  <div style="text-align:center">
    <p>Logging in as <strong>${creds.email}</strong>...</p>
    <form id="loginForm" method="POST" action="${baseUrl}/api/auth/callback/credentials">
      <input type="hidden" name="email" value="${creds.email}" />
      <input type="hidden" name="password" value="${creds.password}" />
      <input type="hidden" name="csrfToken" value="${csrfToken}" />
      <input type="hidden" name="callbackUrl" value="${baseUrl}/dashboard" />
      <noscript><button type="submit">Click to login</button></noscript>
    </form>
    <script>document.getElementById('loginForm').submit();</script>
  </div>
</body>
</html>`;

    const headers: Record<string, string> = { "Content-Type": "text/html" };
    if (setCookieHeader) {
        headers["Set-Cookie"] = setCookieHeader;
    }

    return new NextResponse(html, {
        status: 200,
        headers,
    });
}
