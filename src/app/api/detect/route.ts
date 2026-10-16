import { NextRequest, NextResponse } from "next/server";
import { inspectZip } from "@/lib/zip";
import { quotaPolicyFor } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

async function bytesFromFile(file: File, policy: { maxUploadBytes: number }): Promise<Buffer> {
  if (file.size <= 0) throw new Error("File kosong tidak dapat diproses.");
  if (file.size > policy.maxUploadBytes) {
    throw new Error(`Ukuran ZIP melewati batas ${Math.floor(policy.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  return Buffer.from(await file.arrayBuffer());
}

async function bytesFromUrl(raw: string, policy: { maxUploadBytes: number }): Promise<{ bytes: Buffer; filename: string }> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("URL tidak valid. Gunakan tautan https langsung ke file .zip.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("URL harus http(s).");
  const response = await fetch(url.toString(), { redirect: "follow" });
  if (!response.ok) throw new Error(`Gagal mengunduh ZIP (HTTP ${response.status}).`);
  const contentType = response.headers.get("content-type") || "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > policy.maxUploadBytes) {
    throw new Error(`Ukuran ZIP melewati batas ${Math.floor(policy.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > policy.maxUploadBytes) {
    throw new Error(`Ukuran ZIP melewati batas ${Math.floor(policy.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  if (!/zip/i.test(contentType) && !url.pathname.toLowerCase().endsWith(".zip")) {
    throw new Error("URL tidak menunjuk ke file .zip.");
  }
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "imported.zip");
  return { bytes: buffer, filename: filename.toLowerCase().endsWith(".zip") ? filename : "imported.zip" };
}

/** Inspect a ZIP without persisting anything. Used by the one-page wizard step 2. */
export async function POST(req: NextRequest) {
  try {
    const policy = quotaPolicyFor("guest");
    const form = await req.formData();
    const file = form.get("file");
    const urlValue = form.get("url");

    let bytes: Buffer;
    let filename = "upload.zip";
    if (file instanceof File) {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json({ error: "Format tidak didukung. Gunakan file .zip." }, { status: 415 });
      }
      filename = file.name;
      bytes = await bytesFromFile(file, policy);
    } else if (typeof urlValue === "string" && urlValue.trim()) {
      const fetched = await bytesFromUrl(urlValue, policy);
      bytes = fetched.bytes;
      filename = fetched.filename;
    } else {
      return NextResponse.json({ error: "Pilih file ZIP atau tempel URL import." }, { status: 400 });
    }

    const inspection = await inspectZip(bytes);
    const detected = inspection.detected;
    return NextResponse.json({
      filename,
      size: bytes.length,
      fileCount: inspection.files.length,
      rootDirectory: inspection.rootDirectory || "/",
      detection: {
        framework: detected.framework,
        vercelFramework: detected.vercelFramework,
        buildCommand: detected.buildCommand,
        outputDirectory: detected.outputDirectory,
        packageManager: detected.packageManager,
        installCommand: detected.installCommand,
        isStatic: detected.isStatic
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arsip tidak dapat diproses.";
    return NextResponse.json({ error: message.slice(0, 240) }, { status: 400 });
  }
}
