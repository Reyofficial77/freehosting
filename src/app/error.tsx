"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
      <div className="w-full max-w-md border border-[#292929] bg-[#080808] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border border-red-900 bg-red-950/30 text-xl text-red-300">!</div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Terjadi kesalahan</h1>
        <p className="mt-2 text-xs leading-6 text-[#929292]">
          Sesuatu berjalan tidak semestinya. Coba muat ulang halaman. Jika masalah berlanjut, periksa konfigurasi server.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#ddd]">
            Coba lagi
          </button>
          <a href="/" className="border border-[#333] px-4 py-2.5 text-xs font-medium transition hover:border-white">
            Ke beranda
          </a>
        </div>
      </div>
    </main>
  );
}
