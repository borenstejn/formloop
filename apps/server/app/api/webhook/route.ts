import { NextRequest, NextResponse } from "next/server";
import { redis, responseKey, RESPONSE_TTL_SECONDS } from "@/lib/redis";
import { checkSecret } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TallyField = {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: Array<{ id: string; text: string }>;
};

type TallyWebhookPayload = {
  eventId?: string;
  eventType?: string;
  createdAt?: string;
  data?: {
    responseId?: string;
    submissionId?: string;
    formId?: string;
    formName?: string;
    createdAt?: string;
    fields?: TallyField[];
  };
};

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as TallyWebhookPayload;
  const formId = payload?.data?.formId;
  if (!formId) {
    return NextResponse.json({ error: "missing formId" }, { status: 400 });
  }

  const simplified = simplifyFields(payload.data?.fields ?? []);
  const stored = {
    formId,
    formName: payload.data?.formName,
    submissionId: payload.data?.submissionId,
    submittedAt: payload.data?.createdAt,
    answers: simplified,
    raw: payload,
  };

  await redis.set(responseKey(formId), JSON.stringify(stored), {
    ex: RESPONSE_TTL_SECONDS,
  });

  return NextResponse.json({ ok: true, formId });
}

function simplifyFields(fields: TallyField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const label = f.label || f.key;
    let value: unknown = f.value;
    if (Array.isArray(f.value) && f.options) {
      const map = Object.fromEntries(f.options.map((o) => [o.id, o.text]));
      value = f.value.map((v) => map[v as string] ?? v);
    } else if (
      typeof f.value === "string" &&
      f.options &&
      f.options.some((o) => o.id === f.value)
    ) {
      value = f.options.find((o) => o.id === f.value)?.text ?? f.value;
    }
    out[label] = value;
  }
  return out;
}
