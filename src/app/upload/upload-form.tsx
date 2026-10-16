"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isTerminal } from "@/lib/status";

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

const FRAMEWORK_OPTIONS = [
  "Auto-detect",
  "Next.js",
  "React / Vite",
  "Vue",
  "Svelte",
  "Astro",
  "HTML / CSS / JS",
  "Node.js",
  "Other"
];

/** Manual framework choice → Vercel projectSettings.framework (null = auto). */
function providerFor(label: string): string | null {
  switch (label) {
    case "Next.js":
      return "nextjs";
    case "React / Vite":
      return "vite";
    case "Vue":
      return "vue";
    case "Svelte":
      return "sveltekit";
    case "Astro":
      return "astro";
    default:
      return null;
  }
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function DeployPage() {
  const [file, setFile] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectResponse | null>(null);
  const [manualFramework, setManualFramework] = useState("Auto-detect");

  const [name, setName] = useState("my-project");
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [outputDir, setOutputDir] = useState("dist");
  const [advanced, setAdvanced] = useState(false);
  const [rootDirectory, setRootDirectory] = useState("/");
  const [packageManager, setPackageManager] = useState("npm");

  const [maxBytes, setMaxBytes] = useState<number | null>(null);
  const [systemsOk, setSystemsOk] = useState<boolean | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployState, setDeployState] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then((j: { ok?: boolean; maxUploadBytes?: number }) => {
        setSystemsOk(Boolean(j.ok));
        if (typeof j.maxUploadBytes === "number") setMaxBytes(j.maxUploadBytes);
      })
      .catch(() => setSystemsOk(false));
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function say(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const effectiveFramework =
    manualFramework !== "Auto-detect"
      ? manualFramework
      : detected?.detection.framework ?? null;

  const currentStep = showResult ? 4 : detected ? 3 : file || detecting ? 2 : 1;

  async function acceptFile(next: File | null) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".zip")) {
      say("Pilih file ZIP yang valid.");
      return;
    }
    if (maxBytes && next.size > maxBytes) {
      say(`Ukuran file melebihi batas ${formatMB(maxBytes)}.`);
      return;
    }
    setFile(next);
    setDetected(null);
    setShowResult(false);
    setDeployError(null);
    setDetecting(true);
    try {
      const data = new FormData();
      data.set("file", next);
      const response = await fetch("/api/detect", { method: "POST", body: data });
      const json = (await response.json()) as DetectResponse;
      if (!response.ok) throw new Error(json.error || "Deteksi gagal.");
      setDetected(json);
      setName(prev => (prev === "my-project" || !prev ? json.filename.replace(/\.zip$/i, "").slice(0, 50) || "my-project" : prev));
      setBuildCommand(json.detection.buildCommand || "npm run build");
      setOutputDir(json.detection.outputDirectory || "dist");
      setRootDirectory(json.rootDirectory);
      setPackageManager(json.detection.packageManager);
      say(`Framework terdeteksi: ${json.detection.framework}.`);
    } catch (error) {
      say(error instanceof Error ? error.message : "Deteksi gagal.");
    } finally {
      setDetecting(false);
    }
  }

  function clearFile() {
    setFile(null);
    setDetected(null);
    setShowResult(false);
    setManualFramework("Auto-detect");
    if (inputRef.current) inputRef.current.value = "";
    say("File dihapus.");
  }

  function slugifyName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  }

  async function deploy() {
    const clean = slugifyName(name);
    if (!file) {
      say("Upload file ZIP project terlebih dahulu.");
      return;
    }
    if (!clean) {
      say("Isi nama project terlebih dahulu.");
      return;
    }
    setDeploying(true);
    setDeployError(null);
    setDeployState("deploying");
    setShowResult(true);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("name", clean);
      data.set("buildCommand", buildCommand);
      data.set("outputDirectory", outputDir);
      data.set("rootDirectory", rootDirectory || "/");
      data.set("packageManager", packageManager);
      if (manualFramework !== "Auto-detect") {
        data.set("framework", manualFramework);
        const provider = providerFor(manualFramework);
        if (provider) data.set("frameworkProvider", provider);
      }
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const json = (await response.json()) as {
        project?: { id: string };
        deployment?: { id: string | null; status: string; url: string | null; errorCode: string | null };
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "Deploy gagal.");
      const id = json.deployment?.id;
      setDeployState(json.deployment?.status ?? null);
      setDeployUrl(json.deployment?.url ?? null);
      if (!id || isTerminal(json.deployment?.status)) {
        if (json.deployment?.status !== "ready") setDeployError(json.deployment?.errorCode ?? "Deployment selesai dengan status tidak aktif.");
        setDeploying(false);
        return;
      }
      timer.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/deployments/${id}`);
          if (!poll.ok) return;
          const body = (await poll.json()) as { deployment?: { status: string; deploymentUrl: string | null; errorCode: string | null } };
          if (body.deployment) {
            setDeployState(body.deployment.status);
            setDeployUrl(body.deployment.deploymentUrl);
            if (isTerminal(body.deployment.status)) {
              if (timer.current) clearInterval(timer.current);
              timer.current = null;
              setDeploying(false);
              if (body.deployment.status === "ready") say("Website berhasil di-deploy.");
              else setDeployError(body.deployment.errorCode ?? "Deployment gagal. Periksa log build.");
            }
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : "Deploy gagal.");
      setDeployState("failed");
      setDeploying(false);
    }
  }

  async function copyUrl() {
    if (!deployUrl) return;
    try {
      await navigator.clipboard.writeText(deployUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      say("Salin manual URL di atas.");
      return;
    }
    setTimeout(() => setCopied(false), 1800);
  }

  const steps = ["Upload / Import", "Framework", "Configuration", "Deploy"];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-[68px] items-center justify-between border-b border-[#292929] px-[clamp(20px,5vw,72px)]">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="FreeHosting beranda">
          <span className="grid h-[27px] w-[27px] place-items-center border border-white text-[13px] font-extrabold">F</span>
          <span>FreeHosting</span>
        </Link>
        <div className="flex items-center gap-[18px] text-xs text-[#929292]">
          <span>
            <i className={`mr-[7px] inline-block h-1.5 w-1.5 rounded-full ${systemsOk === false ? "bg-red-400" : "bg-white"}`} />
            {systemsOk === null ? "Checking systems…" : systemsOk ? "All systems operational" : "Systems degraded"}
          </span>
          <span>v1.0</span>
        </div>
      </header>

      <main className="mx-auto max-w-[850px] px-[22px] pb-14 pt-[58px]">
        <p className="mb-[14px] text-[11px] uppercase tracking-[2px] text-[#929292]">Deploy workspace</p>
        <h1 className="text-[clamp(30px,5vw,45px)] font-semibold leading-[1.08] tracking-[-2px]">
          Dari source code<br />menjadi website.
        </h1>
        <p className="mb-[34px] mt-[15px] max-w-[540px] text-sm leading-[1.7] text-[#929292]">
          Upload project kamu, periksa konfigurasi, lalu deploy. Semua proses ada di satu tempat, tanpa pengaturan yang rumit.
        </p>

        <div className="mb-7 grid grid-cols-2 border border-[#292929] sm:grid-cols-4" aria-label="Tahapan deploy">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = currentStep > n;
            const active = currentStep === n;
            return (
              <div
                key={label}
                className={`flex items-center gap-[9px] border-[#292929] p-[13px_12px] text-[11px] max-sm:[&:nth-child(odd)]:border-r sm:border-r sm:last:border-r-0 ${
                  active ? "bg-[#0a0a0a] text-white" : done ? "text-[#cfcfcf]" : "text-[#777]"
                }`}
              >
                <b className={`grid h-[22px] w-[22px] place-items-center border text-[10px] font-medium ${active ? "border-white" : "border-[#383838]"}`}>
                  {done ? "✓" : String(n).padStart(2, "0")}
                </b>
                {label}
              </div>
            );
          })}
        </div>

        {/* STEP 01 — Upload */}
        <section className="mb-[14px] border border-[#292929] p-6" aria-label="Upload project">
          <div className="mb-[19px] flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Upload project</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#929292]">Pilih arsip ZIP dari perangkat kamu.</p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[1.5px] text-[#666]">Step 01</span>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer border border-dashed p-8 text-center transition ${dragging ? "border-white bg-[#0a0a0a]" : "border-[#3a3a3a] hover:border-[#666]"}`}
          >
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center border border-[#3a3a3a] text-lg">↑</div>
            <p className="text-sm font-medium">Drag &amp; drop file project di sini</p>
            <p className="mt-1 text-xs text-[#929292]">ZIP archive{maxBytes ? ` · Maksimal ${formatMB(maxBytes)}` : ""}</p>
            <span className="mt-4 inline-block border border-[#3a3a3a] px-4 py-2 text-xs font-medium transition hover:border-white">
              Pilih file ZIP
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              aria-label="Pilih file ZIP"
              onChange={e => acceptFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#929292]">
            <span>{file ? formatMB(file.size) : "Belum ada file dipilih"}</span>
            <div className="flex items-center gap-2">
              {file && (
                <span className="flex items-center gap-2 text-white">
                  <span className="border border-[#3a3a3a] px-1.5 py-0.5 text-[10px]">ZIP</span>
                  <span className="max-w-[220px] truncate">{file.name}</span>
                </span>
              )}
              {file && (
                <button type="button" onClick={clearFile} className="border border-[#3a3a3a] px-2 py-1 text-[11px] transition hover:border-white">
                  Hapus
                </button>
              )}
            </div>
          </div>
        </section>

        {/* STEP 02 — Framework */}
        <section className="mb-[14px] border border-[#292929] p-6" aria-label="Framework detection" aria-live="polite">
          <div className="mb-[19px] flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Framework detection</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#929292]">
                {file ? "Hasil deteksi dari isi arsip, bukan tebakan nama file." : "Pilih file project untuk memulai deteksi framework."}
              </p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[1.5px] text-[#666]">Step 02</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[#292929] bg-[#080808] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center border border-[#3a3a3a] text-sm font-bold">
                {detecting ? "…" : (effectiveFramework?.charAt(0) ?? "?")}
              </span>
              <span className="text-sm">
                {detecting ? "Mendeteksi framework…" : (effectiveFramework ?? "Menunggu project...")}
                {detected && manualFramework === "Auto-detect" && (
                  <span className="block text-[11px] text-[#666]">{detected.fileCount} file · root {detected.rootDirectory}</span>
                )}
                {manualFramework !== "Auto-detect" && (
                  <span className="block text-[11px] text-[#666]">Pilihan manual</span>
                )}
              </span>
            </div>
            <span className={`border px-2.5 py-1 text-[11px] ${detected || manualFramework !== "Auto-detect" ? "border-white text-white" : "border-[#3a3a3a] text-[#777]"}`}>
              {detecting ? "Detecting…" : detected || manualFramework !== "Auto-detect" ? "Detected" : "Not detected"}
            </span>
          </div>
        </section>

        {/* STEP 03 — Configuration */}
        <section className="mb-[14px] border border-[#292929] p-6" aria-label="Configuration">
          <div className="mb-[19px] flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Configuration</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#929292]">Sesuaikan nama website dan perintah build jika diperlukan.</p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[1.5px] text-[#666]">Step 03</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="projectName" className="mb-1.5 block text-xs text-[#929292]">Nama project</label>
              <input
                id="projectName"
                value={name}
                maxLength={50}
                onChange={e => setName(slugifyName(e.target.value))}
                placeholder="contoh: portfolio-rey"
                className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-white focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#666]">URL: {(slugifyName(name) || "nama-project")}.vercel.app</p>
            </div>
            <div>
              <label htmlFor="frameworkSelect" className="mb-1.5 block text-xs text-[#929292]">Framework</label>
              <select
                id="frameworkSelect"
                value={manualFramework}
                onChange={e => setManualFramework(e.target.value)}
                className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              >
                {FRAMEWORK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="buildCommand" className="mb-1.5 block text-xs text-[#929292]">Build command</label>
              <input
                id="buildCommand"
                value={buildCommand}
                onChange={e => setBuildCommand(e.target.value)}
                placeholder="npm run build"
                className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="outputDir" className="mb-1.5 block text-xs text-[#929292]">Output directory</label>
              <input
                id="outputDir"
                value={outputDir}
                onChange={e => setOutputDir(e.target.value)}
                placeholder="dist atau build"
                className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-white focus:outline-none"
              />
            </div>
          </div>
          <button type="button" onClick={() => setAdvanced(v => !v)} className="mt-4 text-xs text-[#929292] underline underline-offset-4 hover:text-white" aria-expanded={advanced}>
            {advanced ? "Sembunyikan pengaturan lanjutan" : "Pengaturan lanjutan (root, package manager)"}
          </button>
          {advanced && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rootDir" className="mb-1.5 block text-xs text-[#929292]">Root directory</label>
                <input
                  id="rootDir"
                  value={rootDirectory}
                  onChange={e => setRootDirectory(e.target.value)}
                  placeholder="/"
                  className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="packageManager" className="mb-1.5 block text-xs text-[#929292]">Package manager</label>
                <select
                  id="packageManager"
                  value={packageManager}
                  onChange={e => setPackageManager(e.target.value)}
                  className="w-full border border-[#3a3a3a] bg-black px-3 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                >
                  {["npm", "pnpm", "yarn", "bun"].map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Deploy bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-[#666]">◇ Simple setup · No shadow, no clutter</span>
          <button
            onClick={deploy}
            disabled={!file || deploying || detecting}
            className="bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ddd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deploying ? "Deploying…" : "Deploy project →"}
          </button>
        </div>

        {/* Result */}
        {showResult && (
          <div className="mt-[14px] border border-[#292929] p-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className={`grid h-8 w-8 place-items-center border text-sm ${deployState === "ready" ? "border-white" : deployState === "failed" ? "border-red-400 text-red-300" : "border-[#3a3a3a]"}`}>
                {deployState === "ready" ? "✓" : deployState === "failed" ? "!" : "…"}
              </span>
              <span className="text-sm font-semibold">
                {deployState === "ready" ? "Deploy berhasil" : deployState === "failed" ? "Deploy gagal" : "Deploy sedang diproses…"}
              </span>
            </div>
            {deployUrl && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[#292929] bg-[#080808] p-4">
                <a href={deployUrl} target="_blank" rel="noreferrer" className="break-all text-sm underline underline-offset-4 hover:text-[#ccc]">
                  {deployUrl.replace(/^https?:\/\//, "")}
                </a>
                <button type="button" onClick={copyUrl} className="shrink-0 border border-[#3a3a3a] px-3 py-1.5 text-xs transition hover:border-white">
                  {copied ? "Tersalin ✓" : "Salin URL"}
                </button>
              </div>
            )}
            {deployError && <p className="mt-3 text-xs leading-relaxed text-red-300">{deployError}</p>}
            {deployState !== "ready" && deployState !== "failed" && (
              <p className="mt-3 text-xs text-[#929292]">Status diperbarui otomatis. Jangan tutup halaman ini.</p>
            )}
          </div>
        )}

        {toast && (
          <div className="mt-[14px] border border-[#3a3a3a] bg-[#0a0a0a] p-4 text-xs text-[#ccc]" aria-live="polite">
            {toast}
          </div>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#292929] px-[clamp(20px,5vw,72px)] py-5 text-xs text-[#666]">
        <span>© 2026 <strong className="text-[#999]">FreeHosting</strong></span>
        <span className="flex gap-4">
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <span>Built for developers. Kept simple.</span>
        </span>
      </footer>
    </div>
  );
}
