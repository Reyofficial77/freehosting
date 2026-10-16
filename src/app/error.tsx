"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#101318] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-red-900/70 bg-red-950/30 text-xl text-red-300">!</div>
        <h1 className="mt-4 text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Sesuatu berjalan tidak semestinya. Coba muat ulang halaman. Jika masalah berlanjut, periksa konfigurasi server.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rounded-lg bg-sky-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-sky-200">
            Coba lagi
          </button>
          <a href="/" className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium transition hover:border-zinc-500">
            Ke beranda
          </a>
        </div>
      </div>
    </main>
  );
}
