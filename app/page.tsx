"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ProjectRow {
  id: string;
  name: string;
  framework: string | null;
  repo: string | null;
  branch: string;
  latest: {
    state: string;
    url: string | null;
    createdAt: number | null;
    commit: string | null;
  } | null;
}

const STATE_STYLES: Record<string, string> = {
  READY: "bg-emerald-500/15 text-emerald-500",
  BUILDING: "bg-amber-500/15 text-amber-500",
  QUEUED: "bg-sky-500/15 text-sky-500",
  INITIALIZING: "bg-sky-500/15 text-sky-500",
  ERROR: "bg-red-500/15 text-red-500",
  CANCELED: "bg-zinc-500/15 text-zinc-400",
  BLOCKED: "bg-red-500/15 text-red-500",
};

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      setProjects(body.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 15000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  async function deploy(p: ProjectRow) {
    setDeploying((prev) => new Set(prev).add(p.id));
    setNotice(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: p.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      setNotice(`Deployment started for ${p.name}`);
      await load();
    } catch (e) {
      setNotice(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeploying((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  const shown = projects?.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.repo ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 font-sans">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deploy Console</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manually trigger production deployments of the latest commit.
            {projects && ` ${projects.length} projects.`}
          </p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter projects…"
          className="w-56 rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700"
        />
      </header>

      {notice && (
        <div className="mb-4 rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      {!projects && !error && <p className="text-sm text-zinc-400">Loading projects…</p>}

      {shown && (
        <div className="overflow-x-auto rounded-lg border border-zinc-300 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Latest production deploy</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const busy = deploying.has(p.id);
                const state = p.latest?.state ?? "NONE";
                return (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-200 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-zinc-500">
                        {p.repo ? `${p.repo} @ ${p.branch}` : "no repo linked"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATE_STYLES[state] ?? "bg-zinc-500/15 text-zinc-400"
                        }`}
                      >
                        {state}
                      </span>
                      {p.latest?.commit && (
                        <div className="mt-1 max-w-72 truncate text-xs text-zinc-500">
                          {p.latest.commit}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      {timeAgo(p.latest?.createdAt ?? null)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deploy(p)}
                        disabled={busy || !p.repo}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      >
                        {busy ? "Deploying…" : "Deploy"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
