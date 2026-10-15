import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getGuestSession, setGuestCookie } from "@/lib/session";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = getGuestSession(req);
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  try {
    const rows = await db.select({ id: projects.id, name: projects.name, slug: projects.slug, framework: projects.framework, status: projects.status, createdAt: projects.createdAt }).from(projects).where(eq(projects.guestSessionId, session.id)).orderBy(desc(projects.createdAt)).limit(50);
    const response = NextResponse.json({ projects: rows });
    return session.isNew ? setGuestCookie(response, session.id) : response;
  } catch { return NextResponse.json({ error: "Tidak dapat memuat proyek." }, { status: 500 }); }
}
