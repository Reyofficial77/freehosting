import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projects, usageRecords } from "@/lib/db/schema";
import { quotaPolicyFor, type Actor } from "@/lib/config";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type Owner = { userId: string | null; guestSessionId: string | null };

export class QuotaError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

function actorKind(owner: Owner): Actor {
  return owner.userId ? "user" : "guest";
}

function ownership(owner: Owner) {
  return owner.userId ? eq(projects.ownerUserId, owner.userId) : eq(projects.guestSessionId, owner.guestSessionId ?? "__none__");
}

export function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Enforces project-count and daily-deployment quotas on the server.
 * Throws QuotaError when a limit is exceeded.
 */
export async function enforceQuota(db: Db, owner: Owner, eventType: "project" | "deployment"): Promise<void> {
  const policy = quotaPolicyFor(actorKind(owner));
  const [activeRow] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(ownership(owner), isNull(projects.deletedAt)));
  const activeCount = Number(activeRow?.value ?? 0);
  if (activeCount >= policy.activeProjects) {
    throw new QuotaError(
      actorKind(owner) === "guest"
        ? `Kuota tamu tercapai (${policy.activeProjects} proyek aktif). Login untuk batas lebih tinggi.`
        : `Kuota proyek aktif tercapai (${policy.activeProjects}). Hapus proyek lama terlebih dahulu.`
    );
  }
  if (eventType === "deployment") {
    const usageFilter = owner.userId
      ? eq(usageRecords.ownerUserId, owner.userId)
      : eq(usageRecords.guestSessionId, owner.guestSessionId ?? "__none__");
    const [deployRow] = await db
      .select({ value: sql<number>`coalesce(sum(${usageRecords.quantity}), 0)` })
      .from(usageRecords)
      .where(and(usageFilter, eq(usageRecords.eventType, "deployment"), gte(usageRecords.periodStart, startOfUtcDay())));
    const deployments = Number(deployRow?.value ?? 0);
    if (deployments >= policy.deploymentsPerDay) {
      throw new QuotaError(`Batas deployment harian tercapai (${policy.deploymentsPerDay}). Coba lagi besok.`);
    }
  }
}

export async function recordUsage(
  db: Db,
  owner: Owner,
  eventType: string,
  projectId: string | null,
  quantity = 1
): Promise<void> {
  await db.insert(usageRecords).values({
    ownerUserId: owner.userId,
    guestSessionId: owner.guestSessionId,
    projectId,
    eventType,
    quantity
  });
}
