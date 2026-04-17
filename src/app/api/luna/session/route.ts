import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import { getLunaToolsForRole, HeidiAccessRole } from "@/lib/ai/luna-tools";
import { buildHeidiInstructions, inferCurrentSection } from "@/lib/ai/heidi-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const apiKey = process.env.OPENAI_API_KEY;
    const requestBody = await request.json().catch(() => ({}));

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 503 });
    }

    const accessRole: HeidiAccessRole = session?.user?.role
      ? (session.user.role as UserRole)
      : "guest";
    const currentPath = typeof requestBody?.currentPath === "string" ? requestBody.currentPath : "";
    const pageTitle = typeof requestBody?.pageTitle === "string" ? requestBody.pageTitle : "";
    const currentSection =
      typeof requestBody?.currentSection === "string"
        ? requestBody.currentSection
        : inferCurrentSection(currentPath);
    const propertyContext =
      requestBody?.propertyContext && typeof requestBody.propertyContext === "object"
        ? JSON.stringify(requestBody.propertyContext).slice(0, 1200)
        : "";

    const allowedTools = getLunaToolsForRole(accessRole);
    const instructions = await buildHeidiInstructions({
      accessRole,
      userId: session?.user?.id,
      currentPath,
      currentSection,
      pageTitle,
      propertyContext,
      mode: "voice",
    });
    
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer", // Feminine, friendly voice preset
        instructions,
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        input_audio_noise_reduction: {
          type: "near_field",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.84,
          prefix_padding_ms: 300,
          silence_duration_ms: 1200,
          create_response: false,
          interrupt_response: true,
        },
        tool_choice: "auto",
        tools: allowedTools.map(tool => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenAI session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
