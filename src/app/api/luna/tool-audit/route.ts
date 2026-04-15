import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { auditService } from "@/lib/audit-service";
import { connectDBSafe } from "@/lib/mongodb";
import { AuditAction, AuditCategory, AuditSeverity } from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDBSafe();
    const session = await auth();
    const body = await request.json().catch(() => ({}));

    const toolName = typeof body?.toolName === "string" ? body.toolName : "unknown_tool";
    const status = typeof body?.status === "string" ? body.status : "unknown";
    const currentPath = typeof body?.currentPath === "string" ? body.currentPath : "";
    const args = body?.args && typeof body.args === "object" ? body.args : {};
    const responsePreview =
      typeof body?.responsePreview === "string" ? body.responsePreview.slice(0, 500) : undefined;

    const context = auditService.extractContextFromRequest(request, session?.user);

    await auditService.logEvent(
      {
        category: AuditCategory.COMMUNICATION,
        action: AuditAction.READ,
        severity: status === "error" ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
        description: `Heidi tool call: ${toolName} (${status})`,
        resourceType: "heidi_tool",
        resourceName: toolName,
        details: {
          toolName,
          status,
          currentPath,
          args,
          responsePreview,
        },
        tags: ["heidi", "tool-call", status],
      },
      { ...context, source: "api" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Heidi tool audit error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
