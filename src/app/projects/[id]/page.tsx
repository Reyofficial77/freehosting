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
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-[68px] items-center justify-between border-b border-[#292929] px-[clamp(20px,5vw,72px)]">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-[27px] w-[27px] place-items-center border border-white text-[13px] font-extrabold">F</span>
          <span>FreeHosting</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/dashboard" className="text-[#929292] hover:text-white">Dashboard</Link>
          <Link href="/upload" className="border border-[#3a3a3a] px-4 py-2 transition hover:border-white">+ Proyek baru</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[850px] px-[22px] pb-14 pt-[58px]">
        <p className="mb-[14px] text-[11px] uppercase tracking-[2px] text-[#929292]">Project detail</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-2 text-xs text-[#929292]">
              {project.framework ?? "Framework belum diketahui"} · {project.sourceType === "github" ? "GitHub" : "ZIP"}
            </p>
          </div>
          <span className={`border px-3 py-1.5 text-xs ${toneClasses(tone)}`}>{statusLabel(effective)}</span>
        </div>

        <div className="mt-8 grid gap-[14px] sm:grid-cols-2">
          <div className="border border-[#292929] bg-[#080808] p-6">
            <div className="text-[10px] uppercase tracking-[1.5px] text-[#666]">Subdomain</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="break-all text-sm font-medium">{hostname}</span>
              <CopyButton label="Salin tautan dashboard" />
            </div>
            <div className="mt-2 text-[11px] text-[#666]">
              Domain {domain ? statusLabel(domain.status) : "belum dipetakan"} · HTTPS {domain?.httpsStatus ?? "unknown"}
            </div>
            {liveUrl && (
              <span className="mt-3 inline-block border border-[#333] px-3 py-1.5 text-[11px] text-[#929292]">
                Pratinjau live tersedia di bawah
              </span>
            )}
          </div>
          <div className="border border-[#292929] bg-[#080808] p-6">
            <div className="text-[10px] uppercase tracking-[1.5px] text-[#666]">Konfigurasi deteksi</div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-[#929292]">Package manager</dt><dd>{settings?.packageManager ?? "npm"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#929292]">Build command</dt><dd className="break-all text-right">{project.buildCommand || "Otomatis"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#929292]">Output directory</dt><dd className="break-all text-right">{project.outputDirectory || "Otomatis"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#929292]">Root directory</dt><dd className="break-all text-right">{project.rootDirectory || "/"}</dd></div>
            </dl>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2px] text-[#929292]">Live preview</h2>
          {liveUrl ? (
            <div className="mt-3">
              <div className="overflow-hidden border border-[#292929] bg-white">
                <iframe
                  src={liveUrl}
                  title={`Pratinjau ${project.name}`}
                  className="h-[480px] w-full"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#666]">
                Pratinjau dimuat dari deployment aktif tanpa meninggalkan dashboard. Jika bingkai kosong, situs tersebut memblokir embed.
              </p>
            </div>
          ) : (
            <div className="mt-3 border border-[#292929] px-6 py-10 text-center text-xs text-[#666]">
              Belum ada deployment aktif untuk dipratinjau.
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2px] text-[#929292]">Riwayat deployment</h2>
          <div className="mt-3 border border-[#292929]">
            {history.length ? (
              history.map(item => {
                const itemTone = statusTone(item.status);
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c1c1c] px-5 py-4 text-sm last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`border px-2.5 py-1 text-[11px] ${toneClasses(itemTone)}`}>{statusLabel(item.status)}</span>
                      <span className="text-[11px] text-[#666]">{item.createdAt.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#666]">
                      {item.errorCode && <span className="text-red-300">{item.errorCode}</span>}
                      {item.logsUrl && <a href={item.logsUrl} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">Log build</a>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center text-xs text-[#666]">Belum ada riwayat deployment.</div>
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
      </main>

      <footer className="flex items-center justify-between border-t border-[#292929] px-[clamp(20px,5vw,72px)] py-5 text-[10px] text-[#777]">
        <span>© 2026 <strong className="font-medium text-[#aaa]">FreeHosting</strong></span>
        <span>Built for developers. Kept simple.</span>
      </footer>
    </div>
  );
}
