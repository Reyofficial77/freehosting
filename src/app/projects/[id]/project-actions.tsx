"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  project: { id: string; name: string; slug: string; buildCommand: string | null; outputDirectory: string | null };
  settings: { installCommand: string | null } | null;
  canRedeploy: boolean;
};

export default function ProjectActions({ project, settings, canRedeploy }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [buildCommand, setBuildCommand] = useState(project.buildCommand ?? "");
  const [outputDirectory, setOutputDirectory] = useState(project.outputDirectory ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, buildCommand: buildCommand || null, outputDirectory: outputDirectory || null })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menyimpan.");
      setMessage({ kind: "ok", text: "Konfigurasi disimpan." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "Gagal menyimpan." });
    } finally {
      setBusy(null);
    }
  }

  async function redeploy() {
    setBusy("redeploy");
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/redeploy`, { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Redeploy gagal.");
      setMessage({ kind: "ok", text: "Redeploy dimulai. Status akan diperbarui otomatis." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "Redeploy gagal." });
    } finally {
      setBusy(null);
    }
  }

  async function checkDomain() {
    setBusy("domain");
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/domain`, { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal memeriksa domain.");
      setMessage({ kind: "ok", text: `Status domain: ${json.domain?.status ?? "tidak diketahui"} · HTTPS ${json.domain?.httpsStatus ?? "unknown"}` });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "Gagal memeriksa domain." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Hapus proyek "${project.name}" beserta deployment dan domainnya? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy("delete");
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menghapus.");
      router.push("/dashboard");
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "Gagal menghapus." });
      setBusy(null);
    }
  }

  const fieldClass = "w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2 focus:border-sky-400";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-[#101318] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pengaturan</h2>
        <p className="mt-2 text-xs text-zinc-500">Perubahan berlaku saat redeploy berikutnya.</p>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label htmlFor="p-name" className="mb-1 block text-zinc-400">Nama tampilan</label>
            <input id="p-name" value={name} onChange={e => setName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="p-slug" className="mb-1 block text-zinc-400">Slug (subdomain)</label>
            <div className="flex items-center gap-2">
              <input id="p-slug" value={slug} onChange={e => setSlug(e.target.value)} className={fieldClass} />
              <span className="shrink-0 text-xs text-zinc-500">.host.my.id</span>
            </div>
          </div>
          <div>
            <label htmlFor="p-build" className="mb-1 block text-zinc-400">Build command</label>
            <input id="p-build" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} placeholder="Otomatis" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="p-output" className="mb-1 block text-zinc-400">Output directory</label>
            <input id="p-output" value={outputDirectory} onChange={e => setOutputDirectory(e.target.value)} placeholder="Otomatis" className={fieldClass} />
          </div>
          {settings?.installCommand && <p className="text-xs text-zinc-500">Install command terdeteksi: <code>{settings.installCommand}</code></p>}
          <button
            onClick={save}
            disabled={busy !== null}
            aria-busy={busy === "save"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-2.5 font-semibold text-black transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "save" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />}
            {busy === "save" ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#101318] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Deployment</h2>
        <p className="mt-3 text-xs text-zinc-500">Memicu deployment baru dari sumber provider yang tersimpan.</p>
        <button
          onClick={redeploy}
          disabled={busy !== null || !canRedeploy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "redeploy" ? "Memulai…" : "Redeploy"}
        </button>
        {!canRedeploy && <p className="mt-2 text-xs text-amber-300">Redeploy tersedia setelah ada deployment provider.</p>}
        <button
          onClick={checkDomain}
          disabled={busy !== null}
          className="mt-4 w-full rounded-lg border border-zinc-700 px-4 py-2.5 font-medium transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "domain" ? "Memeriksa…" : "Periksa status domain"}
        </button>
        <div className="mt-6 border-t border-zinc-800 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-300">Zona bahaya</h3>
          <button
            onClick={remove}
            disabled={busy !== null}
            className="mt-3 w-full rounded-lg border border-red-900 px-4 py-2.5 font-semibold text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "delete" ? "Menghapus…" : "Hapus proyek"}
          </button>
        </div>
      </section>

      {message && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm lg:col-span-2 ${message.kind === "ok" ? "border-emerald-900 bg-emerald-950/30 text-emerald-200" : "border-red-900 bg-red-950/30 text-red-200"}`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
