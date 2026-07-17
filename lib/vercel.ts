// Server-side Vercel API client. Reads VERCEL_TOKEN / VERCEL_TEAM_ID from env.

const API = "https://api.vercel.com";

export interface VercelError {
  status: number;
  code: string;
  message: string;
}

export async function vercelFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ data?: T; error?: VercelError }> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { error: { status: 500, code: "no_token", message: "VERCEL_TOKEN is not set" } };
  }
  const teamId = process.env.VERCEL_TEAM_ID;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API}${path}${teamId ? `${sep}teamId=${teamId}` : ""}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: {
        status: res.status,
        code: body?.error?.code ?? "unknown",
        message: body?.error?.message ?? `Vercel API returned ${res.status}`,
      },
    };
  }
  return { data: body as T };
}
