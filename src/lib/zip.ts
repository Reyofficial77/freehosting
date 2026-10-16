import unzipper from "unzipper";

export const ZIP_LIMITS = {
  maxEntries: 5000,
  maxExpandedBytes: 150 * 1024 * 1024,
  maxSingleFileBytes: 50 * 1024 * 1024,
  maxDeployableBytes: 50 * 1024 * 1024
};

export type ZipFileInfo = { path: string; size: number; type: string };

export type DetectedConfig = {
  framework: string;
  /** Value accepted by the Vercel `projectSettings.framework` enum, or null for static/other. */
  vercelFramework: string | null;
  buildCommand: string;
  outputDirectory: string;
  packageManager: string;
  installCommand: string;
  rootDirectory: string;
  isStatic: boolean;
};

export type ZipInspection = {
  files: ZipFileInfo[];
  rootDirectory: string;
  detected: DetectedConfig;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

type Directory = Awaited<ReturnType<typeof unzipper.Open.buffer>>;
type ZipEntry = Directory["files"][number];

/** Strips any absolute path, drive letter, or ".." segment to block path traversal. */
function assertSafePath(rawPath: string): string {
  const path = rawPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.split("/").some(part => part === "..")) {
    throw new Error("Arsip ditolak karena berisi path yang tidak aman.");
  }
  return path;
}

function isSymlink(entry: ZipEntry): boolean {
  return (entry.type as string) === "SymbolicLink";
}

/** Opens and validates a ZIP archive without extracting anything to disk. */
export async function inspectZip(buffer: Buffer): Promise<ZipInspection> {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Arsip ZIP rusak atau bukan ZIP yang valid.");
  }
  let directory: Directory;
  try {
    directory = await unzipper.Open.buffer(buffer);
  } catch {
    throw new Error("Arsip ZIP rusak atau tidak dapat dibuka.");
  }
  if (directory.files.length > ZIP_LIMITS.maxEntries) throw new Error("Arsip memiliki terlalu banyak file.");

  let expanded = 0;
  const files: ZipFileInfo[] = [];
  for (const entry of directory.files) {
    const path = assertSafePath(entry.path);
    if (isSymlink(entry)) throw new Error("Arsip yang berisi symbolic link tidak diizinkan.");
    if (entry.type === "Directory") continue;
    const size = Number(entry.uncompressedSize || 0);
    if (!Number.isFinite(size) || size < 0 || size > ZIP_LIMITS.maxSingleFileBytes) {
      throw new Error("Ada file dengan ukuran ekstraksi tidak valid atau terlalu besar.");
    }
    expanded += size;
    if (expanded > ZIP_LIMITS.maxExpandedBytes) throw new Error("Ukuran hasil ekstraksi ZIP melewati batas 150 MB.");
    files.push({ path, size, type: entry.type });
  }
  if (!files.length) throw new Error("Arsip ZIP tidak berisi file.");

  const rootDirectory = detectRootDirectory(files.map(f => f.path));
  const detected = await detectFramework(buffer, directory, files, rootDirectory);
  return { files, rootDirectory, detected };
}

/** If every entry sits under a single top-level folder, treat it as the project root. */
export function detectRootDirectory(paths: string[]): string {
  if (!paths.length) return "";
  const firstSegments = new Set(paths.map(p => p.split("/")[0]));
  if (firstSegments.size !== 1) return "";
  const only = [...firstSegments][0];
  if (paths.some(p => p === only)) return "";
  return paths.every(p => p.includes("/")) ? only : "";
}

function relative(path: string, root: string): string {
  if (!root) return path;
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

export function detectFrameworkFromPackage(
  relativePaths: string[],
  packageJson: PackageJson
): Omit<DetectedConfig, "rootDirectory"> {
  const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const has = (p: RegExp) => relativePaths.some(path => p.test(path));
  const buildScript = Boolean(packageJson.scripts?.build);

  let packageManager = "npm";
  let installCommand = "npm install";
  if (relativePaths.some(p => p.endsWith("pnpm-lock.yaml"))) {
    packageManager = "pnpm";
    installCommand = "pnpm install --frozen-lockfile";
  } else if (relativePaths.some(p => p.endsWith("yarn.lock"))) {
    packageManager = "yarn";
    installCommand = "yarn install --frozen-lockfile";
  } else if (relativePaths.some(p => p.endsWith("bun.lockb") || p.endsWith("bun.lock"))) {
    packageManager = "bun";
    installCommand = "bun install --frozen-lockfile";
  } else if (relativePaths.some(p => p.endsWith("package-lock.json"))) {
    packageManager = "npm";
    installCommand = "npm ci";
  }

  const base = { buildCommand: "", outputDirectory: "", packageManager, installCommand, isStatic: false };

  if (deps.next || has(/(^|\/)next\.config\.(js|mjs|ts)$/)) {
    return { ...base, framework: "Next.js", vercelFramework: "nextjs", buildCommand: buildScript ? "next build" : "", outputDirectory: ".next" };
  }
  if (deps.astro || has(/(^|\/)astro\.config\.(mjs|js|ts)$/)) {
    return { ...base, framework: "Astro", vercelFramework: "astro", buildCommand: buildScript ? "astro build" : "", outputDirectory: "dist" };
  }
  if (deps.vite || has(/(^|\/)vite\.config\.(js|ts|mjs)$/)) {
    const label = deps.vue ? "Vue + Vite" : deps.react ? "React + Vite" : "Vite";
    return { ...base, framework: label, vercelFramework: "vite", buildCommand: buildScript ? "vite build" : "", outputDirectory: "dist" };
  }
  if (deps.nuxt || has(/(^|\/)nuxt\.config\.(js|ts)$/)) {
    return { ...base, framework: "Nuxt", vercelFramework: "nuxtjs", buildCommand: buildScript ? "nuxt build" : "", outputDirectory: ".nuxt" };
  }
  if (deps["@angular/core"] || has(/(^|\/)angular\.json$/)) {
    return { ...base, framework: "Angular", vercelFramework: "angular", buildCommand: buildScript ? "ng build" : "", outputDirectory: "dist" };
  }
  if (deps["react-scripts"]) {
    return { ...base, framework: "Create React App", vercelFramework: "create-react-app", buildCommand: buildScript ? "react-scripts build" : "", outputDirectory: "build" };
  }
  if (deps["@vue/cli-service"] || has(/(^|\/)vue\.config\.(js|ts)$/)) {
    return { ...base, framework: "Vue", vercelFramework: "vue", buildCommand: buildScript ? "vue-cli-service build" : "", outputDirectory: "dist" };
  }
  if (has(/(^|\/)index\.html$/)) {
    return { ...base, framework: "HTML statis", vercelFramework: null, buildCommand: "", outputDirectory: "", isStatic: true };
  }
  // Unknown toolchain: fall back to automatic Vercel detection.
  return { ...base, framework: "Tidak dikenali", vercelFramework: null, buildCommand: packageJson.scripts?.build ? "npm run build" : "", outputDirectory: "" };
}

async function readPackageJson(directory: Directory, root: string): Promise<PackageJson> {
  const target = root ? `${root}/package.json` : "package.json";
  const entry = directory.files.find(candidate => {
    const path = candidate.path.replace(/\\/g, "/");
    return path === target && candidate.type !== "Directory" && Number(candidate.uncompressedSize || 0) <= 1024 * 1024;
  });
  if (!entry) return {};
  try {
    return JSON.parse((await entry.buffer()).toString("utf8")) as PackageJson;
  } catch {
    return {};
  }
}

export async function detectFramework(
  _buffer: Buffer,
  directory: Directory,
  files: ZipFileInfo[],
  rootDirectory: string
): Promise<DetectedConfig> {
  const relativePaths = files.map(f => relative(f.path, rootDirectory));
  const packageJson = await readPackageJson(directory, rootDirectory);
  return { rootDirectory, ...detectFrameworkFromPackage(relativePaths, packageJson) };
}

/**
 * Reads every stored file into memory as a Buffer so it can be sent to the
 * deployment provider. Enforces a total cap to avoid unbounded memory use.
 * Never executes user code.
 */
export async function materializeZipFiles(
  buffer: Buffer,
  inspection: ZipInspection
): Promise<{ path: string; relativePath: string; data: Buffer }[]> {
  const directory = await unzipper.Open.buffer(buffer);
  const byPath = new Map(directory.files.map(entry => [entry.path.replace(/\\/g, "/"), entry]));
  const result: { path: string; relativePath: string; data: Buffer }[] = [];
  let total = 0;
  for (const file of inspection.files) {
    const entry = byPath.get(file.path);
    if (!entry) continue;
    const data = await entry.buffer();
    total += data.length;
    if (total > ZIP_LIMITS.maxDeployableBytes) {
      throw new Error("Total ukuran file melebihi batas yang dapat dideploy. Kurangi aset besar.");
    }
    result.push({ path: file.path, relativePath: relative(file.path, inspection.rootDirectory), data });
  }
  return result;
}

// Backwards-compatible helpers kept for callers that only need validation.
export async function validateZip(buffer: Buffer): Promise<{ files: ZipFileInfo[] }> {
  const { files } = await inspectZip(buffer);
  return { files };
}
