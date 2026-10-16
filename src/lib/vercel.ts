// Minimal Vercel REST API client used by the deployment orchestrator.
// Server-only: it reads DEPLOY_API_TOKEN and must never run in the browser.
import { deployConfig } from "@/lib/config";

const API = "https://api.vercel.com";

export class VercelError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "VercelError";
    this.status = status;
    this.code = code;
  }
}

export type VercelReadyState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "BLOCKED";

export type InlineFile = { file: string; data: string; encoding: "base64" };

export type ProjectSettings = {
  framework?: string | null;
  buildCommand?: string | null;
  installCommand?: string | null;
  outputDirectory?: string | null;
  rootDirectory?: string | null;
  nodeVersion?: string;
};

export type CreateDeploymentInput = {
  name: string;
  files?: InlineFile[];
  deploymentId?: string;
  projectSettings?: ProjectSettings;
  target?: string;
};

export type DeploymentResult = {
  id: string;
  url: string | null;
  readyState: VercelReadyState;
  projectId: string | null;
  inspectorUrl: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type DomainResult = {
  name: string;
  verified: boolean;
  verification?: unknown;
};

function buildUrl(path: string): string {
  const { teamId } = deployConfig();
  const url = new URL(API + path);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const config = deployConfig();
  if (!config.token) throw new VercelError("DEPLOY_API_TOKEN belum dikonfigurasi.", 500, "deploy_not_configured");
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const record = (body && typeof body === "object" ? body : {}) as { error?: { message?: string; code?: string }; message?: string };
    const message = record.error?.message || record.message || `Vercel API error ${response.status}`;
    throw new VercelError(String(message).slice(0, 400), response.status, record.error?.code);
  }
  return body as T;
}

type RawDeployment = {
  id: string;
  url?: string | null;
  readyState: VercelReadyState;
  projectId?: string | null;
  inspectorUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function toDeployment(raw: RawDeployment): DeploymentResult {
  return {
    id: raw.id,
    url: raw.url ?? null,
    readyState: raw.readyState,
    projectId: raw.projectId ?? null,
    inspectorUrl: raw.inspectorUrl ?? null,
    errorCode: raw.errorCode ?? null,
    errorMessage: raw.errorMessage ?? null
  };
}

export async function createDeployment(input: CreateDeploymentInput): Promise<DeploymentResult> {
  const config = deployConfig();
  const query = new URLSearchParams({ skipAutoDetectionConfirmation: "1" });
  if (input.files && !input.deploymentId) query.set("forceNew", "1");
  const body: Record<string, unknown> = { name: input.name, target: input.target || config.target };
  if (input.files) body.files = input.files;
  if (input.deploymentId) body.deploymentId = input.deploymentId;
  if (input.projectSettings) body.projectSettings = input.projectSettings;
  const raw = await request<RawDeployment>(`/v13/deployments?${query.toString()}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return toDeployment(raw);
}

export async function getDeployment(id: string): Promise<DeploymentResult> {
  const raw = await request<RawDeployment>(`/v13/deployments/${encodeURIComponent(id)}`, { method: "GET" });
  return toDeployment(raw);
}

export async function deleteDeployment(id: string): Promise<void> {
  await request(`/v13/deployments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addDomain(projectIdOrName: string, hostname: string): Promise<DomainResult> {
  const raw = await request<{ name?: string; verified?: boolean; verification?: unknown }>(
    `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`,
    { method: "POST", body: JSON.stringify({ name: hostname }) }
  );
  return { name: raw.name || hostname, verified: Boolean(raw.verified), verification: raw.verification };
}

export async function verifyDomain(projectIdOrName: string, hostname: string): Promise<DomainResult> {
  const raw = await request<{ name?: string; verified?: boolean; verification?: unknown }>(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(hostname)}/verify`,
    { method: "POST" }
  );
  return { name: raw.name || hostname, verified: Boolean(raw.verified), verification: raw.verification };
}

export async function removeDomain(projectIdOrName: string, hostname: string): Promise<void> {
  await request(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(hostname)}`,
    { method: "DELETE" }
  );
}

export async function getDomainConfig(
  projectIdOrName: string,
  hostname: string
): Promise<{ configured: boolean; https?: boolean; misconfigured?: boolean }> {
  try {
    const raw = await request<{ misconfigured?: boolean; configuredBy?: string | null }>(
      `/v6/domains/${encodeURIComponent(hostname)}/config?projectIdOrName=${encodeURIComponent(projectIdOrName)}`,
      { method: "GET" }
    );
    return { configured: !raw.misconfigured, misconfigured: Boolean(raw.misconfigured) };
  } catch {
    return { configured: false };
  }
}

export async function deleteProject(idOrName: string): Promise<void> {
  await request(`/v9/projects/${encodeURIComponent(idOrName)}`, { method: "DELETE" });
}

/** Maps a Vercel ready state to the internal deployment status (PRD section 9). */
export function mapReadyState(state: VercelReadyState): string {
  switch (state) {
    case "QUEUED":
      return "queued";
    case "INITIALIZING":
      return "deploying";
    case "BUILDING":
      return "building";
    case "READY":
      return "ready";
    case "ERROR":
    case "BLOCKED":
      return "failed";
    case "CANCELED":
      return "cancelled";
    default:
      return "deploying";
  }
}
