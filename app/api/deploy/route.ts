import { NextRequest, NextResponse } from "next/server";
import { vercelFetch } from "@/lib/vercel";

interface ProjectLink {
  type?: string;
  org?: string;
  repo?: string;
  repoId?: number;
  productionBranch?: string;
}

export async function POST(req: NextRequest) {
  const { projectId } = await req.json().catch(() => ({}));
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: { message: "projectId is required" } }, { status: 400 });
  }

  const proj = await vercelFetch<{ id: string; name: string; link?: ProjectLink }>(
    `/v9/projects/${projectId}`
  );
  if (proj.error) return NextResponse.json({ error: proj.error }, { status: proj.error.status });

  const link = proj.data!.link;
  if (link?.type !== "github" || !link.repoId) {
    return NextResponse.json(
      { error: { message: "Project has no GitHub repo linked" } },
      { status: 400 }
    );
  }

  const dep = await vercelFetch<{ id: string; readyState: string; url?: string }>(
    "/v13/deployments",
    {
      method: "POST",
      body: JSON.stringify({
        name: proj.data!.name,
        project: proj.data!.id,
        target: "production",
        gitSource: {
          type: "github",
          repoId: link.repoId,
          ref: link.productionBranch ?? "main",
        },
      }),
    }
  );
  if (dep.error) {
    const friendly =
      dep.error.code === "api-deployments-free-per-day"
        ? "Daily deployment limit reached (100/day on Hobby). Try again after it resets."
        : dep.error.message;
    return NextResponse.json(
      { error: { ...dep.error, message: friendly } },
      { status: dep.error.status }
    );
  }

  return NextResponse.json({
    id: dep.data!.id,
    state: dep.data!.readyState,
    url: dep.data!.url ?? null,
  });
}
