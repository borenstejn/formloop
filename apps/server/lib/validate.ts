import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MAX_BYTES = 512 * 1024; // 512 KB

/**
 * Parse a JSON request body with size validation.
 * Returns the parsed body on success, or a NextResponse error on failure.
 */
export async function parseJsonBody<T = unknown>(
  req: NextRequest,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<T | NextResponse> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: `payload too large (max ${maxBytes} bytes)` },
      { status: 413 },
    );
  }

  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      return NextResponse.json(
        { error: `payload too large (max ${maxBytes} bytes)` },
        { status: 413 },
      );
    }
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}

/**
 * Type guard: returns true if the result is a NextResponse (i.e. an error).
 */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

// Form IDs are generated as alphanumeric strings of length 10 (62^10 entropy).
// 64 is a generous upper bound to defend against absurdly long ids hitting
// store keys (would just 404 anyway, but keeps memory usage bounded).
const FORM_ID_REGEX = /^[A-Za-z0-9]{1,64}$/;

export function isValidFormId(id: unknown): id is string {
  return typeof id === "string" && FORM_ID_REGEX.test(id);
}
