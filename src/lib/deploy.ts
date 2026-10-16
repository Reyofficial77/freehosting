// Deployment orchestration: persists state in Neon and drives the Vercel API.
// Server-only. No user code is ever executed here.
import { and, eq } from "drizzle-orm";
import { deployConfig, isDeployConfigured, projectHostname } from "@/lib/config";
import type { Db } from "@/lib/db";
import { deployments, domains, jobs, projects, projectSettings } from "@/lib/db/schema";
import {
  addDomain,
  createDeployment as providerCreateDeployment,
  deleteDeployment,
  deleteProject,
  getDomainConfig,
  getDeployment as providerGetDeployment,
  mapReadyState,
  removeDomain,
  verifyDomain,
  VercelError,
  type InlineFile,
  type ProjectSettings
} from "@/lib/vercel";

export type ProjectRow = typeof projects.$inferSelect;
export type DeploymentRow = typeof deployments.$inferSelect;
export type SettingsRow = typeof projectSettings.$inferSelect;

export type MaterializedFile = { relativePath: string; data: Buffer };

export const TERMINAL_STATUSES = new Set(["ready", "failed", "cancelled"]);

export class DeployNotConfiguredError extends Error {
  status = 503;
  constructor() {
    super("Integrasi deployment (DEPLOY_API_TOKEN) belum dikonfigurasi di server.");
    this.name = "DeployNotConfiguredError";
  }
}

function safeErrorCode(error: unknown): string {
  if (error instanceof VercelError) return (error.code || `provider_http_${error.status}`).slice(0, 64);
  return "provider_error";
}

function buildProjectSettings(project: ProjectRow, settings: SettingsRow | null): ProjectSettings {
  return {
    framework: settings?.frameworkProvider ?? null,
    buildCommand: (settings?.buildCommand || project.buildCommand || "") || null,
    installCommand: settings?.installCommand || null,
    outputDirectory: (settings?.outputDirectory || project.outputDirectory || "") || null,
    // Files are already flattened relative to the detected root directory.
    rootDirectory: null
  };
}

function toInlineFiles(files: MaterializedFile[]): InlineFile[] {
  return files.map(file => ({ file: file.relativePath, data: file.data.toString("base64"), encoding: "base64" as const }));
}

async function finishJob(db: Db, jobId: string, status: "done" | "failed", errorCode: string | null) {
  await db.update(jobs).set({ status, finishedAt: new Date(), lastErrorCode: errorCode }).where(eq(jobs.id, jobId));
}

/**
 * Creates a deployment (fresh upload or a redeploy that reuses the previous
 * provider deployment) and stores every provider identifier and status.
 */
export async function startDeployment(input: {
  db: Db;
  project: ProjectRow;
  settings: SettingsRow | null;
  files?: MaterializedFile[];
  redeployFrom?: string | null;
}): Promise<{ deployment: DeploymentRow; configured: boolean }> {
  const { db, project, settings } = input;
  const [deployment] = await db
    .insert(deployments)
    .values({ projectId: project.id, provider: "vercel", status: "queued", startedAt: new Date() })
    .returning();
  const [job] = await db
    .insert(jobs)
    .values({
      jobType: input.redeployFrom ? "redeploy" : "deploy",
      projectId: project.id,
      deploymentId: deployment.id,
      status: "running",
      startedAt: new Date()
    })
    .returning();

  if (!isDeployConfigured()) {
    await db.update(deployments).set({ status: "failed", errorCode: "deploy_not_configured", finishedAt: new Date() }).where(eq(deployments.id, deployment.id));
    await db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, project.id));
    await finishJob(db, job.id, "failed", "deploy_not_configured");
    return { deployment: { ...deployment, status: "failed", errorCode: "deploy_not_configured" }, configured: false };
  }

  const name = project.providerProjectName || project.slug;
  try {
    const created = input.redeployFrom
      ? await providerCreateDeployment({ name, deploymentId: input.redeployFrom, target: deployConfig().target })
      : await providerCreateDeployment({
          name,
          files: toInlineFiles(input.files || []),
          projectSettings: buildProjectSettings(project, settings)
        });

    const status = mapReadyState(created.readyState);
    const finished = TERMINAL_STATUSES.has(status);
    await db
      .update(deployments)
      .set({
        providerDeploymentId: created.id,
        providerProjectId: created.projectId,
        status,
        deploymentUrl: created.url ? `https://${created.url}` : null,
        logsUrl: created.inspectorUrl ?? null,
        errorCode: created.errorCode ?? null,
        ...(finished ? { finishedAt: new Date() } : {})
      })
      .where(eq(deployments.id, deployment.id));

    const providerProjectId = created.projectId ?? project.providerProjectId;
    await db
      .update(projects)
      .set({ providerProjectId, providerProjectName: name, status, updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    if (status === "ready") {
      await ensureDomain(db, { ...project, providerProjectId, providerProjectName: name });
    }
    await finishJob(db, job.id, "done", null);

    const [fresh] = await db.select().from(deployments).where(eq(deployments.id, deployment.id)).limit(1);
    return { deployment: fresh ?? deployment, configured: true };
  } catch (error) {
    const code = safeErrorCode(error);
    await db.update(deployments).set({ status: "failed", errorCode: code, finishedAt: new Date() }).where(eq(deployments.id, deployment.id));
    await db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, project.id));
    await finishJob(db, job.id, "failed", code);
    throw error;
  }
}

/**
 * Polls the provider for the latest state of a deployment and syncs it to Neon.
 * Called from the status endpoint, keeping polling frequency low.
 */
export async function refreshDeployment(db: Db, deploymentId: string): Promise<DeploymentRow | null> {
  const [deployment] = await db.select().from(deployments).where(eq(deployments.id, deploymentId)).limit(1);
  if (!deployment) return null;
  if (!deployment.providerDeploymentId || TERMINAL_STATUSES.has(deployment.status)) return deployment;

  try {
    const remote = await providerGetDeployment(deployment.providerDeploymentId);
    const status = mapReadyState(remote.readyState);
    const finished = TERMINAL_STATUSES.has(status);
    await db
      .update(deployments)
      .set({
        status,
        deploymentUrl: remote.url ? `https://${remote.url}` : deployment.deploymentUrl,
        logsUrl: remote.inspectorUrl ?? deployment.logsUrl,
        errorCode: remote.errorCode ?? deployment.errorCode,
        durationMs: deployment.startedAt ? Date.now() - new Date(deployment.startedAt).getTime() : null,
        ...(finished ? { finishedAt: new Date() } : {})
      })
      .where(eq(deployments.id, deployment.id));
    await db.update(projects).set({ status, updatedAt: new Date() }).where(eq(projects.id, deployment.projectId));

    if (status === "ready") {
      const [project] = await db.select().from(projects).where(eq(projects.id, deployment.projectId)).limit(1);
      if (project) await ensureDomain(db, project);
    }
  } catch {
    // Provider hiccups must not break the dashboard; the next poll retries.
    return deployment;
  }

  const [fresh] = await db.select().from(deployments).where(eq(deployments.id, deployment.id)).limit(1);
  return fresh ?? deployment;
}

/** Maps slug.host.my.id to the deployment through the provider and records the result. */
export async function ensureDomain(db: Db, project: ProjectRow): Promise<void> {
  const projectRef = project.providerProjectId || project.providerProjectName;
  if (!projectRef) return;
  const hostname = projectHostname(project.slug);
  await db
    .insert(domains)
    .values({ projectId: project.id, hostname, status: "pending" })
    .onConflictDoNothing({ target: domains.hostname });

  const scope = and(eq(domains.hostname, hostname), eq(domains.projectId, project.id));
  try {
    const result = await addDomain(projectRef, hostname);
    await db
      .update(domains)
      .set({
        status: result.verified ? "active" : "pending_verification",
        httpsStatus: result.verified ? "ready" : "pending",
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      })
      .where(scope);
  } catch (error) {
    const code = safeErrorCode(error);
    await db
      .update(domains)
      .set({ status: `error_${code}`.slice(0, 64), lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(scope);
  }
}

/**
 * Re-checks the provider for domain verification and HTTPS configuration.
 * Used to move a project from "pending_verification" to "active" once DNS is ready.
 */
export async function refreshDomainStatus(db: Db, project: ProjectRow): Promise<void> {
  const projectRef = project.providerProjectId || project.providerProjectName;
  if (!projectRef) return;
  const hostname = projectHostname(project.slug);
  const scope = and(eq(domains.hostname, hostname), eq(domains.projectId, project.id));
  const [existing] = await db.select().from(domains).where(scope).limit(1);
  if (!existing) {
    await ensureDomain(db, project);
    return;
  }
  try {
    const verification = await verifyDomain(projectRef, hostname);
    const config = await getDomainConfig(projectRef, hostname);
    await db
      .update(domains)
      .set({
        status: verification.verified ? "active" : "pending_verification",
        httpsStatus: config.misconfigured ? "misconfigured" : config.configured ? "ready" : "pending",
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      })
      .where(scope);
  } catch (error) {
    await db
      .update(domains)
      .set({ status: `error_${safeErrorCode(error)}`.slice(0, 64), lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(scope);
  }
}

/** Removes provider domains, deployments and the project when a project is deleted. */
export async function cleanupProviderResources(db: Db, project: ProjectRow): Promise<void> {
  const projectRef = project.providerProjectId || project.providerProjectName;
  const rows = await db.select().from(domains).where(eq(domains.projectId, project.id));
  if (projectRef) {
    for (const domain of rows) {
      try {
        await removeDomain(projectRef, domain.hostname);
      } catch {
        /* best effort */
      }
    }
    try {
      await deleteProject(projectRef);
    } catch {
      // Fall back to deleting individual deployments if project removal is unavailable.
      const list = await db.select().from(deployments).where(eq(deployments.projectId, project.id));
      for (const item of list) {
        if (!item.providerDeploymentId) continue;
        try {
          await deleteDeployment(item.providerDeploymentId);
        } catch {
          /* best effort */
        }
      }
    }
  }
}
