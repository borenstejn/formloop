import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  responseKey,
  specKey,
  submissionIndexKey,
  submissionKey,
  RESPONSE_TTL_SECONDS,
} from "@/lib/redis";
import { generateFormId } from "@/lib/id";
import type {
  FormSpec,
  StoredResponse,
  Submission,
  Respondent,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeRespondent(input: unknown): Respondent | undefined {
  if (!input || typeof input !== "object") return undefined;
  const r = input as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const email = typeof r.email === "string" ? r.email.trim() : "";
  if (!name && !email) return undefined;
  const out: Respondent = {};
  if (name) out.name = name;
  if (email) out.email = email;
  return out;
}

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

  let body:
    | { answers?: Record<string, unknown>; respondent?: unknown }
    | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const rawAnswers = body?.answers ?? {};
  const respondent = normalizeRespondent(body?.respondent);

  // Persistent forms: append a Submission keyed by stable question IDs.
  // No label remapping (resolved at export/list time against the frozen spec).
  if (spec.persistent === true) {
    if (
      spec.respondentField &&
      (spec.respondentField.required ?? true) &&
      !respondent
    ) {
      return NextResponse.json(
        { error: "respondent required (name + email)" },
        { status: 400 },
      );
    }

    const submissionId = generateFormId(12);
    const submission: Submission = {
      submission_id: submissionId,
      form_id: id,
      answers: rawAnswers as Record<string, unknown>,
      respondent,
      submitted_at: new Date().toISOString(),
    };

    await redis.set(
      submissionKey(id, submissionId),
      JSON.stringify(submission),
    );
    await redis.rpush(submissionIndexKey(id), submissionId);

    return NextResponse.json({ ok: true, submission_id: submissionId });
  }

  // Ephemeral (legacy) path: build labelMap, remap answers, overwrite response:{id}.
  // Groups expose their nested questions individually (each has its own id/title).
  const labelMap: Record<string, string> = {};
  for (const block of spec.blocks) {
    if (block.kind === "html") continue;
    if (block.kind === "group") {
      for (const q of block.questions) {
        if (q.id) labelMap[q.id] = q.title;
        if (q.comment?.id) labelMap[q.comment.id] = q.comment.label ?? `${q.title} — commentaire`;
      }
      continue;
    }
    if ("id" in block && block.id) {
      labelMap[block.id] = block.title;
      if (block.comment?.id) labelMap[block.comment.id] = block.comment.label ?? `${block.title} — commentaire`;
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
