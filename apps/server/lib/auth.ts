import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

export function checkSecret(req: NextRequest): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  // Local mode: no secret configured → open access (localhost-only by design)
  if (!expected) return true;

  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!provided) return false;

  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(provided, "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
