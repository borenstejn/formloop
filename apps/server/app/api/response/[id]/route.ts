import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { checkSecret } from "@/lib/auth";
import { isValidFormId } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidFormId(id)) {
    return NextResponse.json({ error: "invalid form id" }, { status: 400 });
  }
  const store = getStore();
  const raw = await store.getResponse(id);
  if (!raw) {
    return NextResponse.json({ status: "pending" }, { status: 404 });
  }

  const data = JSON.parse(raw);

  if (req.nextUrl.searchParams.get("consume") === "1") {
    await store.deleteResponse(id);
  }

  return NextResponse.json({ status: "ready", ...data });
}
