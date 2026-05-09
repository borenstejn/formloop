import { NextRequest, NextResponse } from "next/server";
import { redis, responseKey } from "@/lib/redis";
import { checkSecret } from "@/lib/auth";

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
  const raw = await redis.get<string>(responseKey(id));
  if (!raw) {
    return NextResponse.json({ status: "pending" }, { status: 404 });
  }

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (req.nextUrl.searchParams.get("consume") === "1") {
    await redis.del(responseKey(id));
  }

  return NextResponse.json({ status: "ready", ...data });
}
