/**
 * Demo Login API - Server-side login for environments where client-side
 * signIn() doesn't work (e.g. IDE Simple Browser, embedded webviews).
 *
 * Usage: GET /api/auth/demo-login?role=admin
 * Roles: admin, manager, owner, tenant
 */

import { NextRequest, NextResponse } from "next/server";
import { signInAction as signIn } from "@/lib/auth";

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

    try {
        // Use NextAuth server-side signIn action
        await signIn("credentials", {
            email: creds.email,
            password: creds.password,
            redirect: false,
        });
    } catch (error: any) {
        // NextAuth v5 signIn throws a NEXT_REDIRECT "error" on success
        // which is actually the redirect response. We catch and follow it.
        if (error?.digest?.startsWith("NEXT_REDIRECT")) {
            // Extract redirect URL or default to /dashboard
            const redirectUrl = error?.digest?.split(";")?.[2] || "/dashboard";
            return NextResponse.redirect(
                new URL(redirectUrl, request.url),
                { status: 302 }
            );
        }

        console.error("Demo login error:", error);
        return NextResponse.json(
            { error: "Login failed", details: error?.message },
            { status: 500 }
        );
    }

    // If we get here without error, redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url), {
        status: 302,
    });
}
