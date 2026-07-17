import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// HTTP Basic auth for the whole app. Set DASHBOARD_USER + DASHBOARD_PASSWORD to
// enable (auth is skipped when DASHBOARD_PASSWORD is unset). Required before
// deploying this console anywhere public, since its API can trigger deployments
// with the server's Vercel token.
export function proxy(request: NextRequest) {
  const user = process.env.DASHBOARD_USER ?? "admin";
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = `Basic ${btoa(`${user}:${password}`)}`;
  if (request.headers.get("authorization") === expected) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="deploy-console"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
