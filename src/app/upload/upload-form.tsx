 "use client";
import { useState } from "react";
type Result = { projectId?: string; name?: string; slug?: string; framework?: string; buildCommand?: string; outputDirectory?: string; error?: string; message?: string };
export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!file) return;
    setBusy(true); setResult(null);
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const json = await response.json(); setResult(json);
    } catch { setResult({ error: "Koneksi gagal. Periksa server lalu coba kembali." }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 rounded-2xl border border-zinc-800 bg-[#101318] p-5 sm:p-7">
    <label htmlFor="zip" className="mb-3 block text-sm font-medium">Arsip proyek</label>
    <input id="zip" type="file" accept=".zip,application/zip" onChange={e=>{setFile(e.target.files?.[0] ?? null);setResult(null)}} className="block w-full cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-black/20 p-5 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"/>
    <p className="mt-3 text-xs text-zinc-500">Format ZIP · batas default 4 MB</p>
    <button disabled={!file||busy} className="mt-6 w-full rounded-xl bg-sky-300 px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{busy?"Memeriksa arsip…":"Validasi & deteksi framework"}</button>
    {result && <div className={`mt-5 rounded-xl border p-4 text-sm ${result.error?"border-red-900 bg-red-950/30 text-red-200":"border-sky-900 bg-sky-950/20 text-sky-100"}`}>
      {result.error ? <><strong>Upload gagal</strong><p className="mt-2">{result.error}</p></> : <><strong>Arsip berhasil divalidasi</strong><p className="mt-2 text-zinc-300">{result.message}</p>{result.framework && <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-black/20 p-3">Framework <div className="mt-1 font-semibold">{result.framework}</div></div><div className="rounded-lg bg-black/20 p-3">Build command <div className="mt-1 font-semibold">{result.buildCommand || "Manual"}</div></div><div className="rounded-lg bg-black/20 p-3">Output directory <div className="mt-1 font-semibold">{result.outputDirectory || "Belum ditentukan"}</div></div><div className="rounded-lg bg-black/20 p-3">Slug <div className="mt-1 font-semibold">{result.slug}.host.my.id</div></div></div>}<p className="mt-3 text-xs text-zinc-400">Deployment provider belum dijalankan dari form ini. Validasi dan deteksi berhasil, tetapi deployment ZIP memerlukan adapter provider yang tervalidasi dan storage pekerjaan.</p></>}
    </div>}
  </form>;
}