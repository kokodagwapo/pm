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

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
    admin: { email: "hi@smartstart.us", password: "SmartStart2025" },
    manager: { email: "manager@smartstart.us", password: "SmartStart2025" },
    owner: { email: "owner@smartstart.us", password: "SmartStart2025" },
    tenant: { email: "tenant@smartstart.us", password: "SmartStart2025" },
};

export async function GET(request: NextRequest) {
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

    // Fetch a CSRF token from the NextAuth endpoint
    // Use NEXTAUTH_URL from env (ensures localhost, not 0.0.0.0)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || request.nextUrl.origin;
    try {
        const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
            headers: { cookie: cookieStore.toString() },
        });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken || "";
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

    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
    });
}
