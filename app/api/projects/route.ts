import { NextResponse } from "next/server";
import { vercelFetch } from "@/lib/vercel";

interface VercelDeployment {
  id?: string;
  readyState?: string;
  url?: string;
  createdAt?: number;
  meta?: Record<string, string>;
}

interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  link?: {
    type?: string;
    org?: string;
    repo?: string;
    repoId?: number;
    productionBranch?: string;
  };
  targets?: { production?: VercelDeployment };
  latestDeployments?: VercelDeployment[];
}

export async function GET() {
  const projects: VercelProject[] = [];
  let until: number | undefined;
  for (;;) {
    const qs = until ? `&until=${until}` : "";
    const { data, error } = await vercelFetch<{
      projects: VercelProject[];
      pagination?: { next?: number };
    }>(`/v9/projects?limit=100${qs}`);
    if (error) return NextResponse.json({ error }, { status: error.status });
    projects.push(...(data!.projects ?? []));
    if (!data!.pagination?.next) break;
    until = data!.pagination.next;
  }

  const rows = projects
    .map((p) => {
      const latest = p.targets?.production ?? p.latestDeployments?.[0];
      return {
        id: p.id,
        name: p.name,
        framework: p.framework ?? null,
        repo: p.link?.type === "github" ? `${p.link.org}/${p.link.repo}` : null,
        branch: p.link?.productionBranch ?? "main",
        latest: latest
          ? {
              state: latest.readyState ?? "UNKNOWN",
              url: latest.url ?? null,
              createdAt: latest.createdAt ?? null,
              commit: latest.meta?.githubCommitMessage?.split("\n")[0] ?? null,
            }
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ projects: rows });
}
