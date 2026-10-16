// Server-only configuration and quota policy.
// Never import this from a Client Component: it reads secrets.

export type Actor = "guest" | "user";

export type DeployConfig = {
  token: string;
  teamId: string;
  enabled: boolean;
  /** "production" or "preview" */
  target: string;
};

export type QuotaPolicy = {
  activeProjects: number;
  deploymentsPerDay: number;
  maxUploadBytes: number;
};

export const siteConfig = {
  name: "FreeHosting",
  mainDomain: process.env.MAIN_DOMAIN || "freehost.my.id",
  /** Suffix used for per-project subdomains, e.g. slug.host.my.id */
  projectDomain: process.env.PROJECT_DOMAIN || "host.my.id"
};

export function deployConfig(): DeployConfig {
  return {
    token: process.env.DEPLOY_API_TOKEN || process.env.VERCEL_TOKEN || "",
    teamId: process.env.DEPLOY_TEAM_ID || process.env.VERCEL_TEAM_ID || "",
    enabled: (process.env.DEPLOY_ENABLED ?? "true").toLowerCase() !== "false",
    target: process.env.DEPLOY_TARGET || "production"
  };
}

export function isDeployConfigured(): boolean {
  const config = deployConfig();
  return Boolean(config.token && config.enabled);
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Quota limits are read on the server and can be tuned with environment
 * variables without touching the UI. Values are deliberately conservative
 * defaults; the PRD marks the final numbers as "to be tested".
 */
export function quotaPolicyFor(actor: Actor): QuotaPolicy {
  const maxUploadBytes = numberFromEnv(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
  if (actor === "user") {
    return {
      activeProjects: numberFromEnv(process.env.QUOTA_USER_PROJECTS, 10),
      deploymentsPerDay: numberFromEnv(process.env.QUOTA_USER_DEPLOYS_PER_DAY, 50),
      maxUploadBytes
    };
  }
  return {
    activeProjects: numberFromEnv(process.env.QUOTA_GUEST_PROJECTS, 2),
    deploymentsPerDay: numberFromEnv(process.env.QUOTA_GUEST_DEPLOYS_PER_DAY, 5),
    maxUploadBytes
  };
}

export function projectHostname(slug: string): string {
  return `${slug}.${siteConfig.projectDomain}`;
}
