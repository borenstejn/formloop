import { NextRequest } from "next/server";

export function checkSecret(req: NextRequest): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;
  const provided =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-webhook-secret") ??
    "";
  return constantTimeEqual(provided, expected);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
