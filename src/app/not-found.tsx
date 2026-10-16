import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
      <div className="w-full max-w-md border border-[#292929] bg-[#080808] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border border-[#333] text-xl">?</div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Halaman atau proyek tidak ditemukan</h1>
        <p className="mt-2 text-xs leading-6 text-[#929292]">
          Tautan mungkin salah, atau proyek ini dibuat pada sesi browser yang berbeda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#ddd]">
            Ke dashboard
          </Link>
          <Link href="/" className="border border-[#333] px-4 py-2.5 text-xs font-medium transition hover:border-white">
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
