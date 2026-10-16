import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDeployConfigured, siteConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const deploy = isDeployConfigured() ? "configured" : "not_configured";
  if (!databaseConfigured) return NextResponse.json({ ok: false, database: "not_configured", deploy }, { status: 503 });
  try {
    const db = getDb();
    if (!db) throw new Error("Database unavailable");
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "connected", deploy, projectDomain: siteConfig.projectDomain });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable", deploy }, { status: 503 });
  }
}
