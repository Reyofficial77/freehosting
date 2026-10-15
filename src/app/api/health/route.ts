import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
export const runtime = "nodejs";
export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  if (!databaseConfigured) return NextResponse.json({ ok: false, database: "not_configured" }, { status: 503 });
  try {
    const db = getDb();
    if (!db) throw new Error("Database unavailable");
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
