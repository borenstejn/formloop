import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  specKey,
  submissionIndexKey,
  submissionKey,
} from "@/lib/redis";
import { checkSecret } from "@/lib/auth";
import type { FormSpec, Submission, Block } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "string") s = v;
  else if (typeof v === "number" || typeof v === "boolean") s = String(v);
  else s = JSON.stringify(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type Column = {
  key: string;       // answer id
  header: string;    // CSV column header
};

/**
 * Build column list from spec, in block order. Each question contributes one
 * column; if it has an inline comment field, that contributes a second column.
 */
function buildColumns(blocks: Block[]): Column[] {
  const cols: Column[] = [];
  for (const block of blocks) {
    if (block.kind === "html") continue;
    if ("id" in block && block.id) {
      cols.push({ key: block.id, header: block.title });
      if ("comment" in block && block.comment) {
        cols.push({
          key: block.comment.id,
          header: `${block.title} — ${block.comment.label ?? "commentaire"}`,
        });
      }
    }
  }
  return cols;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkSecret(req)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const { id } = await params;

  const rawSpec = await redis.get<string>(specKey(id));
  if (!rawSpec) {
    return new NextResponse("form not found or expired", { status: 404 });
  }
  const spec: FormSpec =
    typeof rawSpec === "string" ? JSON.parse(rawSpec) : rawSpec;

  if (spec.persistent !== true) {
    return new NextResponse(
      "form is ephemeral; CSV export only available on persistent forms",
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

  const cols = buildColumns(spec.blocks);
  const header = [
    "submission_id",
    "submitted_at",
    "respondent_name",
    "respondent_email",
    ...cols.map((c) => c.header),
  ];

  const lines: string[] = [];
  lines.push(header.map(csvEscape).join(","));

  for (const sub of submissions) {
    const row = [
      sub.submission_id,
      sub.submitted_at,
      sub.respondent?.name ?? "",
      sub.respondent?.email ?? "",
      ...cols.map((c) => sub.answers?.[c.key]),
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  const csv = lines.join("\n") + "\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}.csv"`,
    },
  });
}
