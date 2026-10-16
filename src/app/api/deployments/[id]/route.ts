import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { findOwnedProject, loadDb, resolveSession } from "@/lib/auth";
import { deployments, domains } from "@/lib/db/schema";
import { refreshDeployment } from "@/lib/deploy";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });

  const [deployment] = await db.select().from(deployments).where(eq(deployments.id, id)).limit(1);
  if (!deployment) return NextResponse.json({ error: "Deployment tidak ditemukan." }, { status: 404 });
  const project = await findOwnedProject(db, session.owner, deployment.projectId);
  if (!project) return NextResponse.json({ error: "Deployment tidak ditemukan." }, { status: 404 });

  const refreshed = await refreshDeployment(db, deployment.id);
  const [domain] = await db.select().from(domains).where(eq(domains.projectId, project.id)).limit(1);
  return NextResponse.json({ deployment: refreshed, projectStatus: refreshed?.status ?? project.status, domain: domain ?? null });
}
