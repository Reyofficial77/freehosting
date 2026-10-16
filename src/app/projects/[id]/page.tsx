import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { deployments, domains, projects, projectSettings } from "@/lib/db/schema";
import { getGuestSessionFromCookieValue, guestCookieName } from "@/lib/session";
import { projectHostname } from "@/lib/config";
import { statusLabel, statusTone, toneClasses } from "@/lib/status";
import ProjectActions from "./project-actions";
import CopyButton from "./copy-button";

export const dynamic = "force-dynamic";

async function loadProject(id: string) {
  const db = getDb();
  if (!db) return null;
  const jar = await cookies();
  const sessionId = await getGuestSessionFromCookieValue(jar.get(guestCookieName)?.value);
  if (!sessionId) return null;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project || project.guestSessionId !== sessionId) return null;
  const [settings] = await db.select().from(projectSettings).where(eq(projectSettings.projectId, id)).limit(1);
  const history = await db.select().from(deployments).where(eq(deployments.projectId, id)).orderBy(desc(deployments.createdAt)).limit(30);
  const [domain] = await db.select().from(domains).where(eq(domains.projectId, id)).limit(1);
  return { project, settings: settings ?? null, history, domain: domain ?? null };
}

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProject(id);
  if (!data) notFound();
  const { project, settings, history, domain } = data;
  const hostname = domain?.hostname ?? projectHostname(project.slug);
  const latest = history[0];
  const effective = latest?.status ?? project.status;
  const tone = statusTone(effective);
  const liveUrl = latest?.deploymentUrl ?? null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="font-semibold">← Dashboard</Link>
          <Link href="/upload" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:border-zinc-500">+ Proyek baru</Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-zinc-500">Project detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {project.framework ?? "Framework belum diketahui"} · {project.sourceType === "github" ? "GitHub" : "ZIP"}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-sm ${toneClasses(tone)}`}>{statusLabel(effective)}</span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-[#101318] p-5">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Subdomain</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="break-all font-medium">{hostname}</span>
              <CopyButton value={`https://${hostname}`} label="Salin URL" />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Domain {domain ? statusLabel(domain.status) : "belum dipetakan"} · HTTPS {domain?.httpsStatus ?? "unknown"}
            </div>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-sky-300 underline">
                Buka deployment ↗
              </a>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#101318] p-5">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Konfigurasi deteksi</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-zinc-400">Package manager</dt><dd>{settings?.packageManager ?? "npm"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-400">Build command</dt><dd className="break-all text-right">{project.buildCommand || "Otomatis"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-400">Output directory</dt><dd className="break-all text-right">{project.outputDirectory || "Otomatis"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-400">Root directory</dt><dd className="break-all text-right">{project.rootDirectory || "/"}</dd></div>
            </dl>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Riwayat deployment</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800">
            {history.length ? (
              history.map(item => {
                const itemTone = statusTone(item.status);
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 px-5 py-4 text-sm last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${toneClasses(itemTone)}`}>{statusLabel(item.status)}</span>
                      <span className="text-xs text-zinc-500">{item.createdAt.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {item.errorCode && <span className="text-red-300">{item.errorCode}</span>}
                      {item.logsUrl && <a href={item.logsUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline">Log build</a>}
                      {item.deploymentUrl && <a href={item.deploymentUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline">URL</a>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">Belum ada riwayat deployment.</div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <ProjectActions
            project={{ id: project.id, name: project.name, slug: project.slug, buildCommand: project.buildCommand, outputDirectory: project.outputDirectory }}
            settings={settings ? { installCommand: settings.installCommand } : null}
            canRedeploy={Boolean(latest?.providerDeploymentId)}
          />
        </div>
      </section>
    </main>
  );
}
