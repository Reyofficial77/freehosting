import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, type Db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getGuestSession } from "@/lib/session";
import type { Owner } from "@/lib/quota";

export type Session = {
  owner: Owner;
  isNew: boolean;
};

/**
 * Resolves the caller identity. Registered-user auth is intentionally plugged
 * in here later; today every caller is scoped by a signed guest cookie.
 */
export function resolveSession(req: NextRequest): Session {
  const guest = getGuestSession(req);
  return { owner: { userId: null, guestSessionId: guest.id }, isNew: guest.isNew };
}

/** Builds a WHERE clause that only matches rows owned by this session. */
export function projectOwnership(owner: Owner) {
  return owner.userId
    ? and(eq(projects.ownerUserId, owner.userId), isNull(projects.deletedAt))
    : and(eq(projects.guestSessionId, owner.guestSessionId ?? "__none__"), isNull(projects.deletedAt));
}

export type ProjectRow = typeof projects.$inferSelect;

export async function findOwnedProject(db: Db, owner: Owner, projectId: string): Promise<ProjectRow | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), projectOwnership(owner)))
    .limit(1);
  return row ?? null;
}

export function requireDb(): Db {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  return db;
}

export async function loadDb(): Promise<Db | null> {
  return getDb();
}
