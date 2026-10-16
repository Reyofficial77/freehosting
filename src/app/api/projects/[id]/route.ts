import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { findOwnedProject, loadDb, resolveSession } from "@/lib/auth";
import { deployments, domains, projects, projectSettings } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";
import { projectHostname } from "@/lib/config";
import { cleanupProviderResources, ensureDomain } from "@/lib/deploy";
import { removeDomain, VercelError } from "@/lib/vercel";
import { setGuestCookie } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: z.string().trim().min(1).max(48).optional(),
  buildCommand: z.string().trim().max(256).nullable().optional(),
  outputDirectory: z.string().trim().max(256).nullable().optional(),
  installCommand: z.string().trim().max(256).nullable().optional(),
  rootDirectory: z.string().trim().max(256).nullable().optional()
});

export async function GET(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const project = await findOwnedProject(db, session.owner, id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  const [settings] = await db.select().from(projectSettings).where(eq(projectSettings.projectId, project.id)).limit(1);
  const history = await db.select().from(deployments).where(eq(deployments.projectId, project.id)).orderBy(desc(deployments.createdAt)).limit(30);
  const [domain] = await db.select().from(domains).where(eq(domains.projectId, project.id)).limit(1);
  return NextResponse.json({ project, settings: settings ?? null, deployments: history, domain: domain ?? null });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const project = await findOwnedProject(db, session.owner, id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan konfigurasi tidak valid." }, { status: 400 });
  const input = parsed.data;

  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (input.name) updates.name = input.name;
  if (input.buildCommand !== undefined) updates.buildCommand = input.buildCommand;
  if (input.outputDirectory !== undefined) updates.outputDirectory = input.outputDirectory;
  if (input.rootDirectory !== undefined) updates.rootDirectory = input.rootDirectory || "/";

  let slugChanged = false;
  if (input.slug && input.slug !== project.slug) {
    let nextSlug: string;
    try {
      nextSlug = slugify(input.slug);
    } catch {
      return NextResponse.json({ error: "Slug tidak valid atau dicadangkan." }, { status: 400 });
    }
    const [conflict] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.slug, nextSlug), ne(projects.id, project.id))).limit(1);
    if (conflict) return NextResponse.json({ error: "Slug sudah digunakan proyek lain." }, { status: 409 });
    updates.slug = nextSlug;
    slugChanged = true;
  }

  const [updated] = await db.update(projects).set(updates).where(eq(projects.id, project.id)).returning();

  if (input.buildCommand !== undefined || input.outputDirectory !== undefined || input.installCommand !== undefined || input.rootDirectory !== undefined) {
    await db
      .update(projectSettings)
      .set({
        ...(input.buildCommand !== undefined ? { buildCommand: input.buildCommand } : {}),
        ...(input.outputDirectory !== undefined ? { outputDirectory: input.outputDirectory } : {}),
        ...(input.installCommand !== undefined ? { installCommand: input.installCommand } : {}),
        ...(input.rootDirectory !== undefined ? { rootDirectory: input.rootDirectory || "/" } : {}),
        updatedAt: new Date()
      })
      .where(eq(projectSettings.projectId, project.id));
  }

  if (slugChanged) {
    const projectRef = project.providerProjectId || project.providerProjectName;
    const [oldDomain] = await db.select().from(domains).where(eq(domains.projectId, project.id)).limit(1);
    if (oldDomain) {
      if (projectRef) {
        try {
          await removeDomain(projectRef, oldDomain.hostname);
        } catch {
          /* best effort */
        }
      }
      await db.delete(domains).where(eq(domains.id, oldDomain.id));
    }
    await ensureDomain(db, updated);
  }

  const response = NextResponse.json({ project: updated, hostname: projectHostname(updated.slug) });
  return session.isNew ? setGuestCookie(response, session.owner.guestSessionId!) : response;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const project = await findOwnedProject(db, session.owner, id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });

  try {
    await db.update(projects).set({ status: "deleting", updatedAt: new Date() }).where(eq(projects.id, project.id));
    await cleanupProviderResources(db, project);
  } catch (error) {
    if (error instanceof VercelError) {
      // Continue with local deletion; provider resources can be reconciled later.
    }
  }
  await db.delete(projects).where(eq(projects.id, project.id));
  return NextResponse.json({ deleted: true });
}
