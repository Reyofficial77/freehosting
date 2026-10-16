import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { inspectZip, materializeZipFiles } from "@/lib/zip";
import { loadDb } from "@/lib/auth";
import { projects, projectSettings } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";
import { getGuestSession, setGuestCookie } from "@/lib/session";
import { quotaPolicyFor, projectHostname, isDeployConfigured } from "@/lib/config";
import { enforceQuota, QuotaError, recordUsage } from "@/lib/quota";
import { DeployNotConfiguredError, startDeployment } from "@/lib/deploy";
import { VercelError } from "@/lib/vercel";

export const runtime = "nodejs";
export const maxDuration = 60;

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|unique constraint|23505/i.test(message);
}

export async function POST(req: NextRequest) {
  const session = getGuestSession(req);
  const owner = { userId: null, guestSessionId: session.id };
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "Pilih file ZIP terlebih dahulu." }, { status: 400 });
    if (!value.name.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "Format tidak didukung. Gunakan file .zip." }, { status: 415 });

    const policy = quotaPolicyFor("guest");
    if (value.size <= 0) return NextResponse.json({ error: "File kosong tidak dapat diproses." }, { status: 400 });
    if (value.size > policy.maxUploadBytes) {
      return NextResponse.json({ error: `Ukuran ZIP melewati batas ${Math.floor(policy.maxUploadBytes / 1024 / 1024)} MB.` }, { status: 413 });
    }
    const override = form.get("name");
    const str = (key: string): string | null => {
      const value = form.get(key);
      return typeof value === "string" && value.trim() ? value.trim().slice(0, 256) : null;
    };
    const buildOverride = str("buildCommand");
    const outputOverride = str("outputDirectory");
    const rootOverride = str("rootDirectory");
    const installOverride = str("installCommand");
    const packageOverride = str("packageManager");
    const bytes = Buffer.from(await value.arrayBuffer());
    const inspection = await inspectZip(bytes);
    const base = inspection.detected;
    const rootDirectory = rootOverride || inspection.rootDirectory || "/";
    const detected = {
      ...base,
      buildCommand: buildOverride ?? base.buildCommand,
      outputDirectory: outputOverride ?? base.outputDirectory,
      installCommand: installOverride ?? base.installCommand,
      packageManager: packageOverride ?? base.packageManager
    };

    const db = await loadDb();
    if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi. Atur DATABASE_URL sebelum membuat proyek." }, { status: 503 });
    await enforceQuota(db, owner, "deployment");

    const original = (typeof override === "string" && override.trim()) || value.name.replace(/\.zip$/i, "");
    const name = original.trim().slice(0, 80) || "my-project";
    let baseSlug: string;
    try {
      baseSlug = slugify(name);
    } catch {
      baseSlug = `project-${randomUUID().slice(0, 6)}`;
    }

    let projectId = randomUUID();
    let slug = baseSlug;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 40)}-${randomUUID().slice(0, 5)}`;
      try {
        const [created] = await db
          .insert(projects)
          .values({
            id: projectId,
            name,
            slug: candidate,
            framework: detected.framework,
            sourceType: "zip",
            sourceReference: null,
            rootDirectory,
            buildCommand: detected.buildCommand || null,
            outputDirectory: detected.outputDirectory || null,
            status: "detected",
            guestSessionId: session.id
          })
          .returning();
        slug = created.slug;
        await db.insert(projectSettings).values({
          projectId,
          packageManager: detected.packageManager,
          frameworkProvider: detected.vercelFramework,
          installCommand: detected.installCommand,
          buildCommand: detected.buildCommand || null,
          outputDirectory: detected.outputDirectory || null,
          rootDirectory
        });
        break;
      } catch (error) {
        if (attempt === 7 || !isUniqueViolation(error)) throw error;
        projectId = randomUUID();
      }
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const [settings] = await db.select().from(projectSettings).where(eq(projectSettings.projectId, projectId)).limit(1);
    await recordUsage(db, owner, "project", projectId, 1);

    // Materialize files only when we are actually going to deploy.
    let deploymentStatus = "detected";
    let deploymentUrl: string | null = null;
    let errorCode: string | null = null;
    let deploymentId: string | null = null;

    if (isDeployConfigured()) {
      const files = await materializeZipFiles(bytes, inspection);
      const result = await startDeployment({ db, project, settings: settings ?? null, files });
      deploymentId = result.deployment.id;
      deploymentStatus = result.deployment.status;
      deploymentUrl = result.deployment.deploymentUrl;
      errorCode = result.deployment.errorCode;
      await recordUsage(db, owner, "deployment", projectId, 1);
    } else {
      await db.update(projects).set({ status: "detected", updatedAt: new Date() }).where(eq(projects.id, projectId));
    }

    const message =
      deploymentStatus === "ready"
        ? "Website berhasil dideploy."
        : deploymentStatus === "failed"
          ? "Deployment dibuat tetapi gagal. Periksa konfigurasi lalu coba redeploy."
          : isDeployConfigured()
            ? "Deployment sedang diproses. Status akan diperbarui otomatis."
            : "Arsip tervalidasi dan metadata tersimpan. Integrasi deployment belum diaktifkan di server.";

    const response = NextResponse.json(
      {
        project: { id: projectId, name, slug, framework: detected.framework, status: deploymentStatus },
        deployment: { id: deploymentId, status: deploymentStatus, url: deploymentUrl, errorCode },
        hostname: projectHostname(slug),
        detection: {
          buildCommand: detected.buildCommand,
          outputDirectory: detected.outputDirectory,
          rootDirectory,
          packageManager: detected.packageManager,
          installCommand: detected.installCommand
        },
        message
      },
      { status: 201 }
    );
    return session.isNew ? setGuestCookie(response, session.id) : response;
  } catch (error) {
    if (error instanceof QuotaError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof DeployNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof VercelError) {
      return NextResponse.json({ error: `Provider deployment menolak permintaan: ${error.message}` }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Arsip tidak dapat diproses.";
    const status = /DATABASE_URL|SESSION_SECRET|database|ECONN|relation .* does not exist/i.test(message) ? 503 : 400;
    return NextResponse.json(
      { error: status === 503 ? "Layanan belum siap. Periksa konfigurasi database dan session secret." : message.slice(0, 240) },
      { status }
    );
  }
}
