"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isTerminal, statusLabel, statusTone, toneClasses } from "@/lib/status";

type UploadResponse = {
  project?: { id: string; name: string; slug: string; framework: string; status: string };
  deployment?: { id: string | null; status: string; url: string | null; errorCode: string | null };
  hostname?: string;
  detection?: { buildCommand?: string; outputDirectory?: string; rootDirectory?: string; packageManager?: string };
  message?: string;
  error?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = result?.deployment?.id;
    setStatus(result?.deployment?.status ?? null);
    setLiveUrl(result?.deployment?.url ?? null);
    setLiveError(result?.deployment?.errorCode ?? null);
    if (!id || isTerminal(result?.deployment?.status)) return;
    timer.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/deployments/${id}`);
        if (!response.ok) return;
        const json = (await response.json()) as { deployment?: { status: string; deploymentUrl: string | null; errorCode: string | null } };
        if (json.deployment) {
          setStatus(json.deployment.status);
          setLiveUrl(json.deployment.deploymentUrl);
          setLiveError(json.deployment.errorCode);
          if (isTerminal(json.deployment.status)) {
            if (timer.current) clearInterval(timer.current);
            timer.current = null;
          }
        }
      } catch {
        /* keep polling until terminal */
      }
    }, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [result]);

  function pickFile(next: File | null) {
    setFile(next);
    setResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.name.toLowerCase().endsWith(".zip")) pickFile(dropped);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const data = new FormData();
      data.set("file", file);
      if (name.trim()) data.set("name", name.trim());
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const json = (await response.json()) as UploadResponse;
      setResult(json);
    } catch {
      setResult({ error: "Koneksi gagal. Periksa server lalu coba kembali." });
    } finally {
      setBusy(false);
    }
  }

  const tone = statusTone(status);
  const inProgress = Boolean(result?.deployment?.id) && !isTerminal(status);

  return (
    <form onSubmit={submit} className="mt-8 rounded-2xl border border-zinc-800 bg-[#101318] p-5 sm:p-7">
      <label htmlFor="zip" className="mb-2 block text-sm font-medium">
        Arsip proyek <span className="text-zinc-500">(.zip)</span>
      </label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border border-dashed p-6 text-center transition ${
          dragging ? "border-sky-400 bg-sky-400/10" : "border-zinc-700 bg-black/20"
        }`}
      >
        <input
          ref={inputRef}
          id="zip"
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={e => pickFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3 text-sm">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-300/15 text-lg text-sky-300">🗜</span>
            <div>
              <p className="break-all font-medium">{file.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatBytes(file.size)}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:border-zinc-500">
                Ganti file
              </button>
              <button type="button" onClick={() => pickFile(null)} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
                Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-zinc-800 text-lg">⬆</span>
            <p className="font-medium">Seret file ZIP ke sini</p>
            <p className="mt-1 text-xs text-zinc-500">atau</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-black hover:bg-white">
              Pilih file
            </button>
          </div>
        )}
      </div>

      <label htmlFor="project-name" className="mt-5 mb-2 block text-sm font-medium">
        Nama proyek <span className="text-zinc-500">(opsional)</span>
      </label>
      <input
        id="project-name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="mis. portofolio-saya"
        className="block w-full rounded-xl border border-zinc-700 bg-black/20 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-400"
      />
      <p className="mt-3 text-xs text-zinc-500">Arsip didekompresi di server; kode tidak dijalankan di proses API.</p>

      <button
        disabled={!file || busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-3 font-semibold text-black transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />}
        {busy ? "Memvalidasi & mendeteksi…" : "Validasi & deploy"}
      </button>

      <div aria-live="polite">
        {result && (
          <div className={`mt-5 rounded-xl border p-4 text-sm ${result.error ? "border-red-900 bg-red-950/30 text-red-200" : "border-sky-900 bg-sky-950/20 text-sky-100"}`}>
            {result.error ? (
              <>
                <strong>Upload gagal</strong>
                <p className="mt-2">{result.error}</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{result.message}</strong>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${toneClasses(tone)}`}>
                    {inProgress && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
                    {statusLabel(status)}
                  </span>
                </div>
                {result.project && (
                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-black/20 p-3">Framework <div className="mt-1 font-semibold">{result.project.framework}</div></div>
                    <div className="rounded-lg bg-black/20 p-3">Hostname <div className="mt-1 break-all font-semibold">{result.hostname}</div></div>
                    <div className="rounded-lg bg-black/20 p-3">Build command <div className="mt-1 break-all font-semibold">{result.detection?.buildCommand || "Otomatis"}</div></div>
                    <div className="rounded-lg bg-black/20 p-3">Output directory <div className="mt-1 break-all font-semibold">{result.detection?.outputDirectory || "Otomatis"}</div></div>
                  </div>
                )}
                {liveUrl && (
                  <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-sky-300 underline">
                    Buka deployment ↗
                  </a>
                )}
                {liveError && <p className="mt-3 text-xs text-red-300">Kode error provider: {liveError}</p>}
                {result.project && (
                  <div className="mt-4 flex gap-3 text-xs">
                    <Link href={`/projects/${result.project.id}`} className="rounded-lg bg-sky-300 px-3 py-2 font-semibold text-black">Lihat proyek</Link>
                    <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200">Dashboard</Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
