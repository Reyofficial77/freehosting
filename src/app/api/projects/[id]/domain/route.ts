import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { findOwnedProject, loadDb, resolveSession } from "@/lib/auth";
import { domains } from "@/lib/db/schema";
import { DeployNotConfiguredError, refreshDomainStatus } from "@/lib/deploy";
import { isDeployConfigured } from "@/lib/config";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = resolveSession(req);
  const { id } = await params;
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const project = await findOwnedProject(db, session.owner, id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (!isDeployConfigured()) return NextResponse.json({ error: new DeployNotConfiguredError().message }, { status: 503 });

  await refreshDomainStatus(db, project);
  const [domain] = await db.select().from(domains).where(eq(domains.projectId, project.id)).limit(1);
  return NextResponse.json({ domain: domain ?? null });
}
