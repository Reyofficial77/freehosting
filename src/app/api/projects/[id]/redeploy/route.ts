import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { findOwnedProject, loadDb, resolveSession } from "@/lib/auth";
import { deployments, projectSettings } from "@/lib/db/schema";
import { enforceQuota, QuotaError, recordUsage } from "@/lib/quota";
import { DeployNotConfiguredError, startDeployment } from "@/lib/deploy";
import { VercelError } from "@/lib/vercel";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const project = await findOwnedProject(db, session.owner, id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });

  const [last] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.projectId, project.id))
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  if (!last?.providerDeploymentId) {
    return NextResponse.json(
      { error: "Belum ada deployment provider yang bisa di-redeploy. Upload ulang arsip ZIP." },
      { status: 409 }
    );
  }

  try {
    await enforceQuota(db, session.owner, "deployment");
    const [settings] = await db.select().from(projectSettings).where(eq(projectSettings.projectId, project.id)).limit(1);
    const result = await startDeployment({ db, project, settings: settings ?? null, redeployFrom: last.providerDeploymentId });
    await recordUsage(db, session.owner, "deployment", project.id, 1);
    return NextResponse.json({ deployment: result.deployment }, { status: 202 });
  } catch (error) {
    if (error instanceof QuotaError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof DeployNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof VercelError) return NextResponse.json({ error: `Redeploy gagal: ${error.message}` }, { status: 502 });
    return NextResponse.json({ error: "Redeploy gagal." }, { status: 500 });
  }
}
