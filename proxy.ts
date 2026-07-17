import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optional HTTP Basic auth for the whole app. Set DASHBOARD_PASSWORD to enable
// (username is "admin"). Required before deploying this console anywhere public,
// since its API can trigger deployments with the server's Vercel token.
export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = `Basic ${btoa(`admin:${password}`)}`;
  if (request.headers.get("authorization") === expected) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="deploy-console"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
