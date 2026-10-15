import unzipper from "unzipper";

const MAX_ENTRIES = 5000;
const MAX_EXPANDED_BYTES = 150 * 1024 * 1024;
const MAX_SINGLE_FILE = 50 * 1024 * 1024;

export type ZipFileInfo = { path: string; size: number; type: string };
export async function validateZip(buffer: Buffer): Promise<{ files: ZipFileInfo[] }> {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw new Error("Arsip ZIP rusak atau bukan ZIP yang valid.");
  const directory = await unzipper.Open.buffer(buffer);
  if (directory.files.length > MAX_ENTRIES) throw new Error("Arsip memiliki terlalu banyak file.");
  let expanded = 0;
  const files: ZipFileInfo[] = [];
  for (const entry of directory.files) {
    const path = entry.path.replace(/\\/g, "/");
    if (path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.split("/").some(part => part === "..")) throw new Error("Arsip ditolak karena berisi path yang tidak aman.");
    if (entry.type === "SymbolicLink") throw new Error("Arsip yang berisi symbolic link tidak diizinkan.");
    if (entry.type === "Directory") continue;
    const size = Number(entry.uncompressedSize || 0);
    if (!Number.isFinite(size) || size < 0 || size > MAX_SINGLE_FILE) throw new Error("Ada file dengan ukuran ekstraksi tidak valid atau terlalu besar.");
    expanded += size;
    if (expanded > MAX_EXPANDED_BYTES) throw new Error("Ukuran hasil ekstraksi ZIP melewati batas 150 MB.");
    files.push({ path, size, type: entry.type });
  }
  if (!files.length) throw new Error("Arsip ZIP tidak berisi file.");
  return { files };
}
export async function detectFrameworkFromZip(buffer: Buffer, files: ZipFileInfo[]) {
  const paths = files.map(f => f.path);
  const directory = await unzipper.Open.buffer(buffer);
  const packageEntry = directory.files.find(entry => /(^|\/)package\.json$/.test(entry.path) && entry.type !== "Directory" && Number(entry.uncompressedSize || 0) <= 1024 * 1024);
  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> } = {};
  if (packageEntry) {
    try { packageJson = JSON.parse((await packageEntry.buffer()).toString("utf8")); } catch { /* invalid package.json is handled as manual config */ }
  }
  const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  let framework = "HTML statis", buildCommand = "", outputDirectory = "", packageManager = "npm", installCommand = "npm install";
  if (deps.next || paths.some(p => /(^|\/)next\.config\.(js|mjs|ts)$/.test(p))) { framework = "Next.js"; buildCommand = packageJson.scripts?.build ? "npm run build" : ""; outputDirectory = ".next"; }
  else if (deps.vite || paths.some(p => /(^|\/)vite\.config\.(js|ts|mjs)$/.test(p))) { framework = deps.vue ? "Vue + Vite" : deps.react ? "React + Vite" : "Vite"; buildCommand = packageJson.scripts?.build ? "npm run build" : ""; outputDirectory = "dist"; }
  else if (deps.astro || paths.some(p => /(^|\/)astro\.config\.(mjs|js|ts)$/.test(p))) { framework = "Astro"; buildCommand = packageJson.scripts?.build ? "npm run build" : ""; outputDirectory = "dist"; }
  else if (deps.vue || paths.some(p => /(^|\/)vue\.config\.(js|ts)$/.test(p))) { framework = "Vue"; buildCommand = packageJson.scripts?.build ? "npm run build" : ""; outputDirectory = "dist"; }
  else if (paths.some(p => /(^|\/)index\.html$/.test(p))) framework = "HTML statis";
  if (paths.some(p => p.endsWith("pnpm-lock.yaml"))) { packageManager = "pnpm"; installCommand = "pnpm install --frozen-lockfile"; }
  else if (paths.some(p => p.endsWith("yarn.lock"))) { packageManager = "yarn"; installCommand = "yarn install --frozen-lockfile"; }
  else if (paths.some(p => p.endsWith("bun.lockb") || p.endsWith("bun.lock"))) { packageManager = "bun"; installCommand = "bun install --frozen-lockfile"; }
  return { framework, buildCommand, outputDirectory, packageManager, installCommand };
}
