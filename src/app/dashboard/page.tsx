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
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-[68px] items-center justify-between border-b border-[#292929] px-[clamp(20px,5vw,72px)]">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-[27px] w-[27px] place-items-center border border-white text-[13px] font-extrabold">F</span>
          <span>FreeHosting</span>
        </Link>
        <Link href="/upload" className="bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#ddd]">
          + Buat proyek
        </Link>
      </header>

      <main className="mx-auto max-w-[850px] px-[22px] pb-14 pt-[58px]">
        <p className="mb-[14px] text-[11px] uppercase tracking-[2px] text-[#929292]">Workspace</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(30px,5vw,45px)] font-semibold leading-[1.08] tracking-[-2px]">Dashboard</h1>
            <p className="mt-3 text-sm leading-[1.7] text-[#929292]">Pantau proyek dan status deployment kamu.</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="border border-[#292929] px-4 py-3 text-center">
              <div className="text-lg font-semibold text-white">{projectRows.length}</div>
              <div className="mt-0.5 text-[#666]">Total proyek</div>
            </div>
            <div className="border border-[#292929] px-4 py-3 text-center">
              <div className="text-lg font-semibold text-white">{readyCount}</div>
              <div className="mt-0.5 text-[#666]">Aktif</div>
            </div>
          </div>
        </div>

        {!deployConfigured && (
          <div className="mt-8 border border-[#3a3a3a] bg-[#0a0a0a] p-4 text-xs leading-6 text-[#ccc]">
            <strong className="text-white">Integrasi deployment belum aktif.</strong> Atur <code>DEPLOY_API_TOKEN</code> di server agar proyek dapat diterbitkan.
          </div>
        )}
        {dbUnavailable && (
          <div className="mt-4 border border-[#3a3a3a] bg-[#0a0a0a] p-4 text-xs leading-6 text-[#ccc]">
            <strong className="text-white">Database belum terhubung.</strong> Isi <code>DATABASE_URL</code> di environment lalu jalankan migrasi.
          </div>
        )}

        <div className="mt-8 border border-[#292929]">
          <div className="hidden grid-cols-[1fr_140px_120px_24px] gap-4 border-b border-[#292929] bg-[#080808] px-5 py-3 text-[10px] uppercase tracking-[1.5px] text-[#666] sm:grid">
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
                  className="grid grid-cols-1 gap-3 border-b border-[#1c1c1c] px-5 py-4 text-sm transition last:border-0 hover:bg-[#0a0a0a] sm:grid-cols-[1fr_140px_120px_24px] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{project.name}</div>
                    <div className="mt-1 truncate text-xs text-[#666]">
                      {project.framework ?? "Framework belum diketahui"} · {hostname ?? projectHostname(project.slug)}
                    </div>
                  </div>
                  <span className={`w-fit border px-2.5 py-1 text-[11px] ${toneClasses(tone)}`}>{statusLabel(effective)}</span>
                  <span className="text-xs text-[#666]">{project.createdAt.toLocaleDateString("id-ID")}</span>
                  <span className="hidden text-[#666] sm:block" aria-hidden>→</span>
                </Link>
              );
            })
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center border border-[#3a3a3a] text-xl">↗</div>
              <h2 className="mt-4 text-sm font-semibold">Belum ada proyek</h2>
              <p className="mt-2 text-xs text-[#666]">Upload arsip ZIP untuk memulai proyek pertamamu.</p>
              <Link href="/upload" className="mt-5 inline-block bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#ddd]">
                Upload ZIP
              </Link>
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[#555]">
          Dashboard menggunakan sesi tamu pada browser ini. Login pengguna, klaim proyek tamu, dan kuota lanjutan akan ditambahkan bertahap.
        </p>
      </main>

      <footer className="flex items-center justify-between border-t border-[#292929] px-[clamp(20px,5vw,72px)] py-5 text-[10px] text-[#777]">
        <span>© 2026 <strong className="font-medium text-[#aaa]">FreeHosting</strong></span>
        <span>Built for developers. Kept simple.</span>
      </footer>
    </div>
  );
}
