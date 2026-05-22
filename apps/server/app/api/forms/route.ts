import { NextRequest, NextResponse } from "next/server";
import { getStore, SPEC_TTL_SECONDS } from "@/lib/store";
import { checkSecret } from "@/lib/auth";
import { generateFormId } from "@/lib/id";
import { parseJsonBody, isErrorResponse } from "@/lib/validate";
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
  "group",
]);

// Leaf question kinds = anything that can appear inside a group's questions
const VALID_LEAF_QUESTION_KINDS = new Set([
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

function validateLeafQuestion(q: unknown): boolean {
  if (!q || typeof q !== "object") return false;
  const obj = q as { kind?: string; title?: string };
  if (!obj.kind || !VALID_LEAF_QUESTION_KINDS.has(obj.kind)) return false;
  if (typeof obj.title !== "string" || !obj.title.trim()) return false;
  return true;
}

function validateSpec(spec: unknown): spec is FormSpec {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  if (typeof s.title !== "string" || !s.title.trim()) return false;
  if (!Array.isArray(s.blocks) || s.blocks.length === 0) return false;
  for (const block of s.blocks as Block[]) {
    if (!block || typeof block !== "object") return false;
    if (!VALID_KINDS.has((block as { kind: string }).kind)) return false;
    if (block.kind === "html") continue;
    if (block.kind === "group") {
      const grp = block as { questions?: unknown };
      if (!Array.isArray(grp.questions) || grp.questions.length === 0) return false;
      if (!grp.questions.every(validateLeafQuestion)) return false;
      continue;
    }
    const q = block as { id?: string; title?: string };
    if (typeof q.title !== "string" || !q.title.trim()) return false;
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
    if (b.kind === "group") {
      const groupId = b.id && b.id.trim() ? b.id : `g${i + 1}`;
      const questions = b.questions.map((q, j) => {
        if (q.id && q.id.trim()) return q;
        return { ...q, id: `${groupId}__q${j + 1}` };
      });
      return { ...b, id: groupId, questions };
    }
    if (b.id && b.id.trim()) return b;
    return { ...b, id: `q${i + 1}` };
  });
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody<{ spec?: unknown }>(req);
  if (isErrorResponse(body)) return body;

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
  const store = getStore();

  // Persistent forms: store spec without TTL (frozen forever).
  // Ephemeral forms (default): legacy 24h TTL.
  if (isPersistent) {
    await store.setSpec(formId, JSON.stringify(normalizedSpec));
  } else {
    await store.setSpec(formId, JSON.stringify(normalizedSpec), SPEC_TTL_SECONDS);
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
