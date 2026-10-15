import Link from "next/link";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getGuestSessionFromCookieValue, guestCookieName } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  let rows: Array<typeof projects.$inferSelect> = [];
  let dbUnavailable = false;
  try { const db = getDb(); const jar = await cookies(); const sessionId = await getGuestSessionFromCookieValue(jar.get(guestCookieName)?.value); if (db && sessionId) rows = await db.select().from(projects).where(eq(projects.guestSessionId, sessionId)).orderBy(desc(projects.createdAt)).limit(50); else if (!db) dbUnavailable = true; }
  catch { dbUnavailable = true; }
  return <main className="min-h-screen">
    <header className="border-b border-zinc-800"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link href="/" className="font-semibold">← FreeHosting</Link><Link href="/upload" className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-black">+ Buat proyek</Link></div></header>
    <section className="mx-auto max-w-6xl px-6 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-zinc-500">WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1><p className="mt-2 text-sm text-zinc-400">Pantau proyek dan status deployment kamu.</p></div><div className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400">{rows.length} proyek tersimpan</div></div>
      {dbUnavailable && <div className="mt-8 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">Database belum terhubung. Isi <code>DATABASE_URL</code> di environment lalu jalankan migrasi.</div>}
      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800"><div className="grid grid-cols-[1fr_130px_130px] gap-4 border-b border-zinc-800 bg-zinc-900/40 px-5 py-3 text-xs uppercase tracking-wider text-zinc-500"><span>Proyek</span><span>Status</span><span>Dibuat</span></div>
      {rows.length ? rows.map(p=><div key={p.id} className="grid grid-cols-[1fr_130px_130px] items-center gap-4 border-b border-zinc-900 px-5 py-4 text-sm last:border-0"><div><div className="font-medium">{p.name}</div><div className="mt-1 text-xs text-zinc-500">{p.framework ?? "Framework belum diketahui"} · {p.slug}.host.my.id</div></div><span className="text-zinc-300">{p.status}</span><span className="text-xs text-zinc-500">{p.createdAt.toLocaleDateString("id-ID")}</span></div>):<div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-zinc-800 text-xl">↗</div><h2 className="mt-4 font-medium">Belum ada proyek</h2><p className="mt-2 text-sm text-zinc-500">Upload arsip ZIP untuk memulai proyek pertamamu.</p><Link href="/upload" className="mt-5 inline-flex rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black">Upload ZIP</Link></div>}</div>
      <p className="mt-4 text-xs leading-5 text-zinc-600">Dashboard saat ini menggunakan sesi tamu pada browser ini. Login pengguna, klaim proyek tamu, kuota, dan deployment provider harus diaktifkan sebelum peluncuran publik.</p>
    </section>
  </main>;
}