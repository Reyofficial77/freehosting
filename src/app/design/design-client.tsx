"use client";
import { useRef, useState } from "react";
import s from "./design.module.css";

const STEPS = ["Upload / Import", "Framework", "Configuration", "Deploy"];

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

/** Same filename-guess heuristic as the original single-file mockup. */
function detectFramework(name: string): [string, string, string] {
  const n = name.toLowerCase();
  if (n.includes("next")) return ["Next.js", "N", "Detected"];
  if (n.includes("vite") || n.includes("react")) return ["React / Vite", "R", "Detected"];
  if (n.includes("vue")) return ["Vue", "V", "Detected"];
  if (n.includes("svelte")) return ["Svelte", "S", "Detected"];
  if (n.includes("astro")) return ["Astro", "A", "Detected"];
  if (n.endsWith(".html")) return ["HTML / CSS / JS", "H", "Likely"];
  return ["Unknown framework", "?", "Needs review"];
}

export default function DesignPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [guess, setGuess] = useState<[string, string, string] | null>(null);
  const [frameworkSelect, setFrameworkSelect] = useState("Auto-detect");
  const [manual, setManual] = useState(false);
  const [projectName, setProjectName] = useState("my-project");
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [outputDir, setOutputDir] = useState("dist");
  const [step, setStep] = useState(1);
  const [resultName, setResultName] = useState("my-project");
  const [showResult, setShowResult] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Salin URL");
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef<HTMLSpanElement>(null);

  function acceptFile(next: File | null) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".zip")) {
      setToast("Pilih file ZIP yang valid.");
      return;
    }
    if (next.size > 50 * 1024 * 1024) {
      setToast("Ukuran file melebihi batas 50 MB.");
      return;
    }
    setFile(next);
    const g = detectFramework(next.name);
    setGuess(g);
    setFrameworkSelect(g[0] === "Unknown framework" ? "Auto-detect" : g[0]);
    setManual(false);
    setShowResult(false);
    setStep(2);
    setToast("File dipilih. Deteksi berdasarkan nama arsip masih berupa perkiraan.");
  }

  function clear() {
    setFile(null);
    setGuess(null);
    setFrameworkSelect("Auto-detect");
    setManual(false);
    setShowResult(false);
    setStep(1);
    if (inputRef.current) inputRef.current.value = "";
    setToast("File dihapus.");
  }

  function onFrameworkChange(value: string) {
    setFrameworkSelect(value);
    if (value !== "Auto-detect") setManual(true);
    else setManual(false);
  }

  const frameworkText = manual ? frameworkSelect : (guess?.[0] ?? "Menunggu project...");
  const frameworkMark = manual ? frameworkSelect.charAt(0) : (guess?.[1] ?? "?");
  const frameworkPill = manual ? "Manual selection" : (guess?.[2] ?? "Not detected");
  const detected = manual || guess !== null;

  function deploy() {
    const clean = projectName.trim();
    if (!file) {
      setToast("Upload file ZIP project terlebih dahulu.");
      return;
    }
    if (!clean) {
      setToast("Isi nama project terlebih dahulu.");
      return;
    }
    if (clean.length > 50) {
      setToast("Nama project terlalu panjang.");
      return;
    }
    setStep(4);
    setResultName(clean);
    setShowResult(true);
    setToast("Validasi UI selesai. Belum ada deployment sungguhan.");
  }

  async function copy() {
    const url = `https://${resultName}.vercel.app`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Tersalin ✓");
    } catch {
      const range = document.createRange();
      if (urlRef.current) {
        range.selectNodeContents(urlRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopyLabel("Pilih URL");
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyLabel("Salin URL"), 1800);
  }

  return (
    <div className={`${s.app} ${s.designScope}`}>
      <header className={s.topbar}>
        <div className={s.brand}><span className={s.logo}>F</span><span>FreeHosting</span></div>
        <div className={s["top-right"]}><span><i className={s["status-dot"]}></i>All systems operational</span><span>v1.0</span></div>
      </header>
      <main className={s.main}>
        <p className={s.eyebrow}>Deploy workspace</p>
        <h1 className={s.heading}>Dari source code<br />menjadi website.</h1>
        <p className={s.subheading}>Upload project kamu, periksa konfigurasi, lalu deploy. Semua proses ada di satu tempat, tanpa pengaturan yang rumit.</p>

        <div className={s.steps} aria-label="Tahapan deploy">
          {STEPS.map((label, i) => (
            <div key={label} className={`${s.step} ${step === i + 1 ? s.active : ""} ${step > i + 1 ? s.done : ""}`}>
              <b>{step > i + 1 ? "✓" : String(i + 1).padStart(2, "0")}</b> {label}
            </div>
          ))}
        </div>

        <section className={s.section} aria-label="Upload project">
          <div className={s["section-head"]}>
            <div>
              <h2 className={s["section-title"]}>Upload project</h2>
              <p className={s["section-desc"]}>Pilih folder project atau import arsip ZIP dari perangkat kamu.</p>
            </div>
            <span className={s.optional}>STEP 01</span>
          </div>
          <div
            className={`${s.dropzone} ${drag ? s.drag : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={e => { e.preventDefault(); setDrag(true); }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={e => { e.preventDefault(); setDrag(false); }}
            onDrop={e => { e.preventDefault(); setDrag(false); acceptFile(e.dataTransfer.files[0]); }}
          >
            <div className={s["upload-icon"]}>↑</div>
            <p className={s["drop-title"]}>Drag &amp; drop file project di sini</p>
            <p className={s["drop-copy"]}>ZIP archive · Maksimal 50 MB</p>
            <button className={`${s.btn} ${s.secondary}`} type="button">Pilih file ZIP</button>
            <input ref={inputRef} type="file" accept=".zip,application/zip" hidden onChange={e => acceptFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className={s["upload-bottom"]}>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Belum ada file dipilih"}</span>
            <div className={s["file-info"]} style={{ display: file ? "flex" : "none" }}>
              <span className={s["file-icon"]}>ZIP</span>
              <span className={s["file-name"]}>{file?.name}</span>
            </div>
            <button
              className={`${s.btn} ${s.secondary}`}
              type="button"
              style={{ display: file ? "block" : "none", padding: "6px 9px", minHeight: "auto" }}
              onClick={clear}
            >
              Hapus
            </button>
          </div>
        </section>

        <section className={s.section} aria-label="Framework detection">
          <div className={s["section-head"]}>
            <div>
              <h2 className={s["section-title"]}>Framework detection</h2>
              <p className={s["section-desc"]}>Pilih file project untuk memulai deteksi framework.</p>
            </div>
            <span className={s.optional}>STEP 02</span>
          </div>
          <div className={s.detected}>
            <div className={s["detected-label"]}>
              <span className={s["framework-mark"]}>{frameworkMark}</span>
              <span>{frameworkText}</span>
            </div>
            <span className={s.pill}>{frameworkPill}</span>
          </div>
        </section>

        <section className={s.section} aria-label="Configuration">
          <div className={s["section-head"]}>
            <div>
              <h2 className={s["section-title"]}>Configuration</h2>
              <p className={s["section-desc"]}>Sesuaikan nama website dan perintah build jika diperlukan.</p>
            </div>
            <span className={s.optional}>STEP 03</span>
          </div>
          <div className={s["field-grid"]}>
            <div className={s.field}>
              <label htmlFor="design-projectName">Nama project</label>
              <input
                id="design-projectName"
                maxLength={50}
                placeholder="contoh: portfolio-rey"
                value={projectName}
                onChange={e => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="design-frameworkSelect">Framework</label>
              <select id="design-frameworkSelect" value={frameworkSelect} onChange={e => onFrameworkChange(e.target.value)}>
                {FRAMEWORK_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt === "Auto-detect" ? "Auto-detect" : opt}</option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="design-buildCommand">Build command</label>
              <input id="design-buildCommand" placeholder="npm run build" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} />
            </div>
            <div className={s.field}>
              <label htmlFor="design-outputDir">Output directory</label>
              <input id="design-outputDir" placeholder="dist atau build" value={outputDir} onChange={e => setOutputDir(e.target.value)} />
            </div>
          </div>
        </section>

        <div className={s["footer-actions"]}>
          <span className={s["safe-note"]}>◇ <span>Simple setup · No shadow, no clutter</span></span>
          <button className={s.btn} type="button" onClick={deploy}>Deploy project <span aria-hidden="true">→</span></button>
        </div>

        <div className={`${s.result} ${showResult ? s.show : ""}`} aria-live="polite">
          <div className={s["result-top"]}><span className={s.check}>✓</span><span>Konfigurasi deploy berhasil divalidasi</span></div>
          <div className={s["url-row"]}>
            <span className={s.url} ref={urlRef}>{resultName}.vercel.app</span>
            <button className={s.copy} type="button" onClick={copy}>{copyLabel}</button>
          </div>
          <p className={s["result-note"]}>Simulasi tampilan saja: file ZIP belum diekstrak atau diunggah ke server, dan URL ini belum aktif. Hubungkan backend deploy untuk menjalankan deployment sungguhan.</p>
        </div>
        <div className={s.toast} aria-live="polite">{toast}</div>
      </main>
      <footer className={s.bottom}>
        <span>© 2026 <strong>FreeHosting</strong></span>
        <span>Built for developers. Kept simple.</span>
      </footer>
    </div>
  );
}
