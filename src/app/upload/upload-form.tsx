"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isTerminal, statusLabel, statusTone, toneClasses } from "@/lib/status";

type Detection = {
  framework: string;
  buildCommand: string;
  outputDirectory: string;
  packageManager: string;
  installCommand: string;
  isStatic: boolean;
};

type DetectResponse = {
  filename: string;
  size: number;
  fileCount: number;
  rootDirectory: string;
  detection: Detection;
  error?: string;
};

type UploadResponse = {
  project?: { id: string; name: string; slug: string; framework: string; status: string };
  deployment?: { id: string | null; status: string; url: string | null; errorCode: string | null };
  hostname?: string;
  message?: string;
  error?: string;
};

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Upload", "Detecting", "Configuration", "Deploy"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadWizard() {
  const [step, setStep] = useState<Step>(1);
  const [tab, setTab] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectResponse | null>(null);

  // Step 3 — editable configuration.
  const [name, setName] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [outputDirectory, setOutputDirectory] = useState("");
  const [rootDirectory, setRootDirectory] = useState("/");
  const [packageManager, setPackageManager] = useState("npm");
  const [installCommand, setInstallCommand] = useState("");

  // Step 4 — deploy state.
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragging, setDragging] = useState(false);

  // Live-poll the deployment once created.
  useEffect(() => {
    const id = result?.deployment?.id;
    setLiveStatus(result?.deployment?.status ?? null);
    setLiveUrl(result?.deployment?.url ?? null);
    setLiveError(result?.deployment?.errorCode ?? null);
    if (!id || isTerminal(result?.deployment?.status)) return;
    timer.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/deployments/${id}`);
        if (!response.ok) return;
        const json = (await response.json()) as { deployment?: { status: string; deploymentUrl: string | null; errorCode: string | null } };
        if (json.deployment) {
          setLiveStatus(json.deployment.status);
          setLiveUrl(json.deployment.deploymentUrl);
          setLiveError(json.deployment.errorCode);
          if (isTerminal(json.deployment.status) && timer.current) {
            clearInterval(timer.current);
            timer.current = null;
          }
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [result]);

  function resetAll() {
    setStep(1);
    setFile(null);
    setUrl("");
    setDetected(null);
    setDetectError(null);
    setResult(null);
  }

  /** Step 1 → 2: send the archive to /api/detect (no DB write). */
  async function runDetection() {
    setDetecting(true);
    setDetectError(null);
    try {
      const data = new FormData();
      if (tab === "file") {
        if (!file) return;
        data.set("file", file);
      } else {
        if (!url.trim()) {
          setDetectError("Tempel URL file .zip terlebih dahulu.");
          return;
        }
        data.set("url", url.trim());
      }
      const response = await fetch("/api/detect", { method: "POST", body: data });
      const json = (await response.json()) as DetectResponse;
      if (!response.ok) throw new Error(json.error || "Deteksi gagal.");
      setDetected(json);
      // Prefill configuration from detection.
      setName(prev => prev || json.filename.replace(/\.zip$/i, ""));
      setBuildCommand(json.detection.buildCommand);
      setOutputDirectory(json.detection.outputDirectory);
      setRootDirectory(json.rootDirectory);
      setPackageManager(json.detection.packageManager);
      setInstallCommand(json.detection.installCommand);
      setStep(3);
    } catch (error) {
      setDetectError(error instanceof Error ? error.message : "Deteksi gagal.");
    } finally {
      setDetecting(false);
    }
  }

  /** Step 3 → 4: deploy with the edited configuration. */
  async function runDeploy() {
    setDeploying(true);
    setResult(null);
    try {
      const data = new FormData();
      if (tab === "file") {
        if (!file) return;
        data.set("file", file);
      } else {
        // Re-download server-side from the same URL at deploy time.
        const fetched = await fetch(url.trim());
        const blob = await fetched.blob();
        data.set("file", new File([blob], detected?.filename || "imported.zip", { type: "application/zip" }));
      }
      if (name.trim()) data.set("name", name.trim());
      data.set("buildCommand", buildCommand);
      data.set("outputDirectory", outputDirectory);
      data.set("rootDirectory", rootDirectory || "/");
      data.set("installCommand", installCommand);
      data.set("packageManager", packageManager);
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const json = (await response.json()) as UploadResponse;
      setResult(json);
      setStep(4);
    } catch {
      setResult({ error: "Koneksi gagal. Periksa server lalu coba kembali." });
      setStep(4);
    } finally {
      setDeploying(false);
    }
  }

  const tone = statusTone(liveStatus);
  const inProgress = Boolean(result?.deployment?.id) && !isTerminal(liveStatus);

  return (
    <div className="mt-8">
      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-2 text-center text-xs" aria-label="Langkah deployment">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li
              key={label}
              className={`rounded-xl border px-2 py-2.5 font-medium transition ${
                active
                  ? "border-sky-400 bg-sky-400/10 text-sky-200"
                  : done
                    ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                    : "border-zinc-800 text-zinc-500"
              }`}
            >
              <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-black/30 text-[11px]">
                {done ? "✓" : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#101318] p-5 sm:p-7">
        {/* ── STEP 1: Upload / Import ─────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold">1. Upload / Import proyek</h2>
            <p className="mt-1 text-sm text-zinc-400">Pilih arsip ZIP dari komputer, atau tempel URL langsung ke file ZIP.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab("file")}
                className={`rounded-lg px-3 py-2 font-medium transition ${tab === "file" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                ⬆ Upload file
              </button>
              <button
                type="button"
                onClick={() => setTab("url")}
                className={`rounded-lg px-3 py-2 font-medium transition ${tab === "url" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                🔗 Import URL
              </button>
            </div>

            {tab === "file" ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped?.name.toLowerCase().endsWith(".zip")) setFile(dropped);
                }}
                className={`mt-4 rounded-xl border border-dashed p-6 text-center transition ${
                  dragging ? "border-sky-400 bg-sky-400/10" : "border-zinc-700 bg-black/20"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="sr-only"
                  aria-label="Pilih file ZIP"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-3 text-sm">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-300/15 text-lg text-sky-300">🗜</span>
                    <div>
                      <p className="break-all font-medium">{file.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatBytes(file.size)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:border-zinc-500">Ganti</button>
                      <button type="button" onClick={() => setFile(null)} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Hapus</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-medium">Seret file ZIP ke sini</p>
                    <p className="mt-1 text-xs text-zinc-500">atau</p>
                    <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-black hover:bg-white">
                      Pilih file
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="import-url" className="mb-2 block text-sm font-medium">URL file ZIP</label>
                <input
                  id="import-url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/proyek.zip"
                  inputMode="url"
                  className="block w-full rounded-xl border border-zinc-700 bg-black/20 px-4 py-3 text-sm placeholder:text-zinc-600 focus:border-sky-400"
                />
                <p className="mt-2 text-xs text-zinc-500">Server akan mengunduh dan memeriksa arsip sebelum deploy.</p>
              </div>
            )}

            {detectError && (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200" role="alert">
                {detectError}
              </div>
            )}

            <button
              onClick={runDetection}
              disabled={detecting || (tab === "file" ? !file : !url.trim())}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-3 font-semibold text-black transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {detecting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />}
              {detecting ? "Mendeteksi framework…" : "Lanjut: deteksi framework →"}
            </button>
          </div>
        )}

        {/* ── STEP 2 is automatic (detecting spinner state above).
             STEP 3: Configuration ────────────────────────────── */}
        {step === 3 && detected && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">3. Konfigurasi</h2>
              <span className="rounded-full border border-sky-900 bg-sky-950/40 px-3 py-1 text-xs text-sky-300">
                {detected.detection.framework} · {detected.fileCount} file
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Terdeteksi dari <span className="break-all font-medium text-zinc-300">{detected.filename}</span>. Sesuaikan bila perlu, lalu deploy.
            </p>

            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="cfg-name" className="mb-1 block text-zinc-400">Nama proyek</label>
                <input id="cfg-name" value={name} onChange={e => setName(e.target.value)} placeholder="mis. portofolio-saya"
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400" />
              </div>
              <div>
                <label htmlFor="cfg-build" className="mb-1 block text-zinc-400">Build command</label>
                <input id="cfg-build" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} placeholder="Otomatis"
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400" />
              </div>
              <div>
                <label htmlFor="cfg-output" className="mb-1 block text-zinc-400">Output directory</label>
                <input id="cfg-output" value={outputDirectory} onChange={e => setOutputDirectory(e.target.value)} placeholder="Otomatis"
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400" />
              </div>
              <div>
                <label htmlFor="cfg-root" className="mb-1 block text-zinc-400">Root directory</label>
                <input id="cfg-root" value={rootDirectory} onChange={e => setRootDirectory(e.target.value)} placeholder="/"
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400" />
              </div>
              <div>
                <label htmlFor="cfg-pm" className="mb-1 block text-zinc-400">Package manager</label>
                <select id="cfg-pm" value={packageManager} onChange={e => setPackageManager(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400">
                  {["npm", "pnpm", "yarn", "bun"].map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cfg-install" className="mb-1 block text-zinc-400">Install command</label>
                <input id="cfg-install" value={installCommand} onChange={e => setInstallCommand(e.target.value)} placeholder="Otomatis"
                  className="w-full rounded-lg border border-zinc-700 bg-black/20 px-3 py-2.5 focus:border-sky-400" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium transition hover:border-zinc-500">
                ← Kembali
              </button>
              <button
                onClick={runDeploy}
                disabled={deploying}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-3 font-semibold text-black transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deploying && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />}
                {deploying ? "Mendeploy…" : "Deploy sekarang 🚀"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Deploy result ──────────────────────────── */}
        {step === 4 && (
          <div aria-live="polite">
            <h2 className="text-lg font-semibold">4. Deploy</h2>
            {!result ? (
              <div className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-300" aria-hidden />
                Memulai deployment…
              </div>
            ) : result.error ? (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
                <strong>Deploy gagal</strong>
                <p className="mt-2">{result.error}</p>
                <button onClick={() => setStep(3)} className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-xs hover:border-zinc-500">
                  ← Kembali ke konfigurasi
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/20 p-4 text-sm text-sky-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{result.message}</strong>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${toneClasses(tone)}`}>
                    {inProgress && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
                    {statusLabel(liveStatus)}
                  </span>
                </div>
                {liveUrl && (
                  <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-300 px-5 py-3 font-semibold text-black transition hover:bg-sky-200">
                    Buka website ↗
                  </a>
                )}
                {liveError && <p className="mt-3 text-xs text-red-300">Kode error provider: {liveError}</p>}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {result.project && (
                    <Link href={`/projects/${result.project.id}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-zinc-500">
                      Lihat proyek
                    </Link>
                  )}
                  <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-zinc-500">
                    Dashboard
                  </Link>
                  <button onClick={resetAll} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-zinc-500">
                    + Deploy lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
