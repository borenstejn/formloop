import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { checkSecret } from "@/lib/auth";
import { isValidFormId } from "@/lib/validate";
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
  if (!isValidFormId(id)) {
    return NextResponse.json({ error: "invalid form id" }, { status: 400 });
  }
  const store = getStore();

  const rawSpec = await store.getSpec(id);
  if (!rawSpec) {
    return NextResponse.json(
      { error: "form not found or expired" },
      { status: 404 },
    );
  }
  const spec: FormSpec = JSON.parse(rawSpec);

  if (spec.persistent !== true) {
    return NextResponse.json(
      {
        error:
          "form is ephemeral; use /api/response/{id} instead, or mark the form as persistent at creation",
      },
      { status: 400 },
    );
  }

  const ids = await store.getSubmissionIds(id);

  const submissions: Submission[] = [];
  if (ids.length > 0) {
    const raws = await store.getSubmissions(id, ids);
    for (const raw of raws) {
      if (!raw) continue;
      const parsed: Submission = JSON.parse(raw);
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
