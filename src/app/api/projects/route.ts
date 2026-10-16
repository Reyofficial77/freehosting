import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { loadDb, projectOwnership, resolveSession } from "@/lib/auth";
import { deployments, domains, projects } from "@/lib/db/schema";
import { setGuestCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = resolveSession(req);
  const db = await loadDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  try {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        framework: projects.framework,
        status: projects.status,
        createdAt: projects.createdAt
      })
      .from(projects)
      .where(projectOwnership(session.owner))
      .orderBy(desc(projects.createdAt))
      .limit(50);

    const ids = rows.map(row => row.id);
    const latestDeployment = new Map<string, { status: string; deploymentUrl: string | null }>();
    const hostnames = new Map<string, string>();
    if (ids.length) {
      const depRows = await db
        .select({ projectId: deployments.projectId, status: deployments.status, deploymentUrl: deployments.deploymentUrl, createdAt: deployments.createdAt })
        .from(deployments)
        .where(inArray(deployments.projectId, ids))
        .orderBy(desc(deployments.createdAt));
      for (const dep of depRows) if (!latestDeployment.has(dep.projectId)) latestDeployment.set(dep.projectId, dep);

      const domainRows = await db
        .select({ projectId: domains.projectId, hostname: domains.hostname, status: domains.status })
        .from(domains)
        .where(inArray(domains.projectId, ids));
      for (const domain of domainRows) hostnames.set(domain.projectId, domain.hostname);
    }

    const payload = rows.map(row => ({
      ...row,
      deploymentStatus: latestDeployment.get(row.id)?.status ?? null,
      deploymentUrl: latestDeployment.get(row.id)?.deploymentUrl ?? null,
      hostname: hostnames.get(row.id) ?? null
    }));

    const response = NextResponse.json({ projects: payload });
    return session.isNew ? setGuestCookie(response, session.owner.guestSessionId!) : response;
  } catch {
    return NextResponse.json({ error: "Tidak dapat memuat proyek." }, { status: 500 });
  }
}
