import Link from "next/link";
import { cookies } from "next/headers";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { deployments, domains, projects } from "@/lib/db/schema";
import { getGuestSessionFromCookieValue, guestCookieName } from "@/lib/session";
import { isDeployConfigured, projectHostname } from "@/lib/config";
import { statusLabel, statusTone, toneClasses } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  let projectRows: Awaited<ReturnType<typeof loadProjects>> = [];
  let dbUnavailable = false;
  const deployConfigured = isDeployConfigured();

  try {
    const jar = await cookies();
    const sessionId = await getGuestSessionFromCookieValue(jar.get(guestCookieName)?.value);
    if (sessionId) projectRows = await loadProjects(sessionId);
  } catch {
    dbUnavailable = true;
  }

  async function loadProjects(sessionId: string) {
    const db = getDb();
    if (!db) {
      dbUnavailable = true;
      return [];
    }
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.guestSessionId, sessionId))
      .orderBy(desc(projects.createdAt))
      .limit(50);
    const ids = rows.map(row => row.id);
    if (!ids.length) return rows.map(row => ({ project: row, deployment: null, hostname: null }));

    const depRows = await db
      .select({ projectId: deployments.projectId, status: deployments.status, deploymentUrl: deployments.deploymentUrl, createdAt: deployments.createdAt })
      .from(deployments)
      .where(inArray(deployments.projectId, ids))
      .orderBy(desc(deployments.createdAt));
    const domainRows = await db.select({ projectId: domains.projectId, hostname: domains.hostname }).from(domains).where(inArray(domains.projectId, ids));

    const latest = new Map<string, (typeof depRows)[number]>();
    for (const dep of depRows) if (!latest.has(dep.projectId)) latest.set(dep.projectId, dep);
    const hostMap = new Map(domainRows.map(d => [d.projectId, d.hostname]));

    return rows.map(row => ({ project: row, deployment: latest.get(row.id) ?? null, hostname: hostMap.get(row.id) ?? null }));
  }

  const readyCount = projectRows.filter(({ project, deployment }) => (deployment?.status ?? project.status) === "ready").length;

  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">← FreeHosting</Link>
          <Link href="/upload" className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-sky-200">
            + Buat proyek
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">WORKSPACE</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400">Pantau proyek dan status deployment kamu.</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-white">{projectRows.length}</div>
              <div className="mt-0.5 text-zinc-500">Total proyek</div>
            </div>
            <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-emerald-300">{readyCount}</div>
              <div className="mt-0.5 text-zinc-500">Aktif</div>
            </div>
          </div>
        </div>

        {!deployConfigured && (
          <div className="mt-8 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">
            <strong>Integrasi deployment belum aktif.</strong> Atur <code>DEPLOY_API_TOKEN</code> di server agar proyek dapat diterbitkan.
          </div>
        )}
        {dbUnavailable && (
          <div className="mt-4 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">
            <strong>Database belum terhubung.</strong> Isi <code>DATABASE_URL</code> di environment lalu jalankan migrasi.
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="hidden grid-cols-[1fr_160px_140px_24px] gap-4 border-b border-zinc-800 bg-zinc-900/40 px-5 py-3 text-xs uppercase tracking-wider text-zinc-500 sm:grid">
            <span>Proyek</span><span>Status</span><span>Dibuat</span><span />
          </div>
          {projectRows.length ? (
            projectRows.map(({ project, deployment, hostname }) => {
              const effective = deployment?.status ?? project.status;
              const tone = statusTone(effective);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="grid grid-cols-1 gap-3 border-b border-zinc-900 px-5 py-4 text-sm transition last:border-0 hover:bg-zinc-900/40 sm:grid-cols-[1fr_160px_140px_24px] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{project.name}</div>
                    <div className="mt-1 truncate text-xs text-zinc-500">
                      {project.framework ?? "Framework belum diketahui"} · {hostname ?? projectHostname(project.slug)}
                    </div>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs ${toneClasses(tone)}`}>{statusLabel(effective)}</span>
                  <span className="text-xs text-zinc-500">{project.createdAt.toLocaleDateString("id-ID")}</span>
                  <span className="hidden text-zinc-600 sm:block" aria-hidden>→</span>
                </Link>
              );
            })
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 text-2xl">↗</div>
              <h2 className="mt-4 font-medium">Belum ada proyek</h2>
              <p className="mt-2 text-sm text-zinc-500">Upload arsip ZIP untuk memulai proyek pertamamu.</p>
              <Link href="/upload" className="mt-5 inline-flex rounded-lg bg-sky-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-sky-200">
                Upload ZIP
              </Link>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-600">
          Dashboard menggunakan sesi tamu pada browser ini. Login pengguna, klaim proyek tamu, dan kuota lanjutan akan ditambahkan bertahap.
        </p>
      </section>
    </main>
  );
}
