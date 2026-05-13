import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  specKey,
  submissionIndexKey,
  submissionKey,
} from "@/lib/redis";
import { checkSecret } from "@/lib/auth";
import type { FormSpec, Submission } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rawSpec = await redis.get<string>(specKey(id));
  if (!rawSpec) {
    return NextResponse.json(
      { error: "form not found or expired" },
      { status: 404 },
    );
  }
  const spec: FormSpec =
    typeof rawSpec === "string" ? JSON.parse(rawSpec) : rawSpec;

  if (spec.persistent !== true) {
    return NextResponse.json(
      {
        error:
          "form is ephemeral; use /api/response/{id} instead, or mark the form as persistent at creation",
      },
      { status: 400 },
    );
  }

  const ids = (await redis.lrange<string>(submissionIndexKey(id), 0, -1)) ?? [];

  const submissions: Submission[] = [];
  if (ids.length > 0) {
    const keys = ids.map((sid) => submissionKey(id, sid));
    const raws = await redis.mget<(string | null)[]>(...keys);
    for (const raw of raws ?? []) {
      if (!raw) continue;
      const parsed: Submission =
        typeof raw === "string" ? JSON.parse(raw) : (raw as Submission);
      submissions.push(parsed);
    }
  }

  return NextResponse.json({
    form_id: id,
    form_title: spec.title,
    count: submissions.length,
    submissions,
  });
}
