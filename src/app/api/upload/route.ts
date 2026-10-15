import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { detectFrameworkFromZip, validateZip } from "@/lib/zip";
import { getDb } from "@/lib/db";
import { projects, projectSettings, usageRecords } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";
import { getGuestSession, setGuestCookie } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const session = getGuestSession(req);
    const form = await req.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "Pilih file ZIP terlebih dahulu." }, { status: 400 });
    const max = Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
    if (value.size <= 0) return NextResponse.json({ error: "File kosong tidak dapat diproses." }, { status: 400 });
    if (value.size > max) return NextResponse.json({ error: `Ukuran ZIP melewati batas ${Math.floor(max / 1024 / 1024)} MB.` }, { status: 413 });
    if (!value.name.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "Format tidak didukung. Gunakan file .zip." }, { status: 415 });
    const bytes = Buffer.from(await value.arrayBuffer());
    const validation = await validateZip(bytes);
    const detected = await detectFrameworkFromZip(bytes, validation.files);
    const original = value.name.replace(/\.zip$/i, "");
    const name = original.slice(0, 80) || "my-project";
    const db = getDb();
    let slug = slugify(name) || "project";
    let projectId = randomUUID();
    if (db) {
      // Slug uniqueness is reserved transactionally by the unique constraint; retry a few suffixes on conflict.
      for (let i = 0; i < 8; i++) {
        const candidate = i === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        try {
          const [created] = await db.insert(projects).values({
            id: projectId, name, slug: candidate, framework: detected.framework,
            sourceType: "zip", sourceReference: null, status: "detected", guestSessionId: session.id
          }).returning();
          slug = created.slug;
          await db.insert(projectSettings).values({ projectId, packageManager: detected.packageManager, installCommand: detected.installCommand, buildCommand: detected.buildCommand, outputDirectory: detected.outputDirectory, rootDirectory: "/" });
          await db.insert(usageRecords).values({ ownerUserId: null, guestSessionId: session.id, projectId, eventType: "zip_validated", quantity: 1 });
          break;
        } catch (err) {
          if (i === 7) throw err;
          projectId = randomUUID();
        }
      }
    } else {
      return NextResponse.json({ error: "Database belum dikonfigurasi. Atur DATABASE_URL sebelum membuat proyek." }, { status: 503 });
    }
    const response = NextResponse.json({
      projectId, name, slug, framework: detected.framework, buildCommand: detected.buildCommand,
      outputDirectory: detected.outputDirectory,
      message: `Terdeteksi ${detected.framework}. Metadata tersimpan. Hubungkan adapter deployment sebelum menerbitkan website.`
    }, { status: 201 });
    return session.isNew ? setGuestCookie(response, session.id) : response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arsip tidak dapat diproses.";
    const status = /DATABASE_URL|SESSION_SECRET|database|constraint|duplicate|ECONN/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? "Layanan belum siap. Periksa konfigurasi database dan session secret." : message.slice(0, 240) }, { status });
  }
}