import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateConfig } from "@/lib/groq";
import { saveConfig } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { appIdea, suggestedStack, chaosLevel } = parsed.data;
  try {
    const config = await generateConfig(appIdea, suggestedStack ?? "", chaosLevel);
    const id = await saveConfig(config);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[api/generate] failed", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
