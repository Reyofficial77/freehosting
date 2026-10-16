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

  const fieldClass = "w-full border border-[#333] bg-black px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-white focus:outline-none";

  return (
    <div className="grid gap-[14px] lg:grid-cols-2">
      <section className="border border-[#292929] bg-[#080808] p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[2px] text-[#929292]">Pengaturan</h2>
        <p className="mt-2 text-[11px] text-[#666]">Perubahan berlaku saat redeploy berikutnya.</p>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label htmlFor="p-name" className="mb-1.5 block text-[11px] text-[#bdbdbd]">Nama tampilan</label>
            <input id="p-name" value={name} onChange={e => setName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="p-slug" className="mb-1.5 block text-[11px] text-[#bdbdbd]">Slug (subdomain)</label>
            <div className="flex items-center gap-2">
              <input id="p-slug" value={slug} onChange={e => setSlug(e.target.value)} className={fieldClass} />
              <span className="shrink-0 text-[11px] text-[#666]">.host.my.id</span>
            </div>
          </div>
          <div>
            <label htmlFor="p-build" className="mb-1.5 block text-[11px] text-[#bdbdbd]">Build command</label>
            <input id="p-build" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} placeholder="Otomatis" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="p-output" className="mb-1.5 block text-[11px] text-[#bdbdbd]">Output directory</label>
            <input id="p-output" value={outputDirectory} onChange={e => setOutputDirectory(e.target.value)} placeholder="Otomatis" className={fieldClass} />
          </div>
          {settings?.installCommand && <p className="text-[11px] text-[#666]">Install command terdeteksi: <code className="text-[#ccc]">{settings.installCommand}</code></p>}
          <button
            onClick={save}
            disabled={busy !== null}
            aria-busy={busy === "save"}
            className="flex w-full items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ddd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "save" ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </section>

      <section className="border border-[#292929] bg-[#080808] p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[2px] text-[#929292]">Deployment</h2>
        <p className="mt-3 text-[11px] leading-5 text-[#666]">Memicu deployment baru dari sumber provider yang tersimpan.</p>
        <button
          onClick={redeploy}
          disabled={busy !== null || !canRedeploy}
          className="mt-4 w-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ddd] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "redeploy" ? "Memulai…" : "Redeploy"}
        </button>
        {!canRedeploy && <p className="mt-2 text-[11px] text-[#929292]">Redeploy tersedia setelah ada deployment provider.</p>}
        <button
          onClick={checkDomain}
          disabled={busy !== null}
          className="mt-4 w-full border border-[#333] px-4 py-2.5 text-sm font-medium transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "domain" ? "Memeriksa…" : "Periksa status domain"}
        </button>
        <div className="mt-6 border-t border-[#292929] pt-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[2px] text-red-300">Zona bahaya</h3>
          <button
            onClick={remove}
            disabled={busy !== null}
            className="mt-3 w-full border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "delete" ? "Menghapus…" : "Hapus proyek"}
          </button>
        </div>
      </section>

      {message && (
        <div
          role="status"
          className={`border p-4 text-xs leading-6 lg:col-span-2 ${message.kind === "ok" ? "border-[#3a3a3a] bg-[#0a0a0a] text-[#ccc]" : "border-red-900 bg-red-950/30 text-red-200"}`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
