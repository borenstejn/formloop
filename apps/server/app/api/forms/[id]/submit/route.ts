import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  responseKey,
  specKey,
  RESPONSE_TTL_SECONDS,
} from "@/lib/redis";
import type { FormSpec, StoredResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rawSpec = await redis.get<string>(specKey(id));
  if (!rawSpec) {
    return NextResponse.json({ error: "form not found or expired" }, { status: 404 });
  }
  const spec: FormSpec = typeof rawSpec === "string" ? JSON.parse(rawSpec) : rawSpec;

  let body: { answers?: Record<string, unknown> } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const rawAnswers = body?.answers ?? {};

  const labelMap: Record<string, string> = {};
  for (const block of spec.blocks) {
    if (block.kind !== "html" && "id" in block && block.id) {
      labelMap[block.id] = block.title;
    }
  }

  const answers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    const label = labelMap[k] ?? k;
    answers[label] = v;
  }

  const stored: StoredResponse = {
    formId: id,
    formName: spec.title,
    submittedAt: new Date().toISOString(),
    answers,
    source: "custom",
  };

  await redis.set(responseKey(id), JSON.stringify(stored), {
    ex: RESPONSE_TTL_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
