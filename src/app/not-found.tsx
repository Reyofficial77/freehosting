import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#101318] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-zinc-800 text-xl">🔍</div>
        <h1 className="mt-4 text-xl font-semibold">Halaman atau proyek tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Tautan mungkin salah, atau proyek ini dibuat pada sesi browser yang berbeda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg bg-sky-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-sky-200">
            Ke dashboard
          </Link>
          <Link href="/" className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium transition hover:border-zinc-500">
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
