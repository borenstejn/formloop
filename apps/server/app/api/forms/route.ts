import { NextRequest, NextResponse } from "next/server";
import { redis, specKey, SPEC_TTL_SECONDS } from "@/lib/redis";
import { checkSecret } from "@/lib/auth";
import { generateFormId } from "@/lib/id";
import type { FormSpec, Block, RespondentField } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS = new Set([
  "html",
  "mc",
  "multi",
  "text",
  "textarea",
  "yn",
  "number",
  "scale",
  "html-pick",
  "rank",
  "scale-preview",
]);

function validateRespondentField(rf: unknown): rf is RespondentField {
  if (!rf || typeof rf !== "object") return false;
  const r = rf as Record<string, unknown>;
  return r.type === "email-name";
}

function validateSpec(spec: unknown): spec is FormSpec {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  if (typeof s.title !== "string" || !s.title.trim()) return false;
  if (!Array.isArray(s.blocks) || s.blocks.length === 0) return false;
  for (const block of s.blocks as Block[]) {
    if (!block || typeof block !== "object") return false;
    if (!VALID_KINDS.has((block as { kind: string }).kind)) return false;
    if (block.kind !== "html") {
      const q = block as { id?: string; title?: string };
      if (typeof q.title !== "string" || !q.title.trim()) return false;
    }
  }
  if (s.respondentField !== undefined && !validateRespondentField(s.respondentField)) {
    return false;
  }
  if (s.persistent !== undefined && typeof s.persistent !== "boolean") {
    return false;
  }
  return true;
}

function ensureIds(blocks: Block[]): Block[] {
  return blocks.map((b, i) => {
    if (b.kind === "html") return b;
    if (b.id && b.id.trim()) return b;
    return { ...b, id: `q${i + 1}` };
  });
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { spec?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const spec = body?.spec;
  if (!validateSpec(spec)) {
    return NextResponse.json({ error: "invalid spec" }, { status: 400 });
  }

  const isPersistent = spec.persistent === true;

  const normalizedSpec: FormSpec = {
    ...spec,
    blocks: ensureIds(spec.blocks),
    createdAt: new Date().toISOString(),
  };

  const formId = generateFormId();

  // Persistent forms: store spec without TTL (frozen forever).
  // Ephemeral forms (default): legacy 24h TTL.
  if (isPersistent) {
    await redis.set(specKey(formId), JSON.stringify(normalizedSpec));
  } else {
    await redis.set(specKey(formId), JSON.stringify(normalizedSpec), {
      ex: SPEC_TTL_SECONDS,
    });
  }

  const origin =
    process.env.PUBLIC_BRIDGE_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  return NextResponse.json({
    form_id: formId,
    form_url: `${origin}/forms/${formId}`,
    persistent: isPersistent,
    expires_in_seconds: isPersistent ? null : SPEC_TTL_SECONDS,
  });
}
