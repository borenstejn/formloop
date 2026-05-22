import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/forms/:path*"],
};

export function middleware(req: NextRequest) {
  const user = process.env.FORMS_AUTH_USER;
  const pass = process.env.FORMS_AUTH_PASSWORD;

  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const [u, p] = decoded.split(":");
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="formloop"' },
  });
}
