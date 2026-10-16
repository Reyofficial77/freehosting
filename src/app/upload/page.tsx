import Link from "next/link";
import UploadForm from "./upload-form";

export const metadata = { title: "Upload proyek" };

export default function UploadPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-semibold">← FreeHosting</Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">Dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-xs uppercase tracking-[.2em] text-sky-300">New deployment</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Upload proyek ZIP</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Kami memeriksa arsip dan mendeteksi konfigurasi framework sebelum proses deployment.
        </p>
        <UploadForm />
        <div className="mt-8 rounded-xl border border-zinc-800 p-4 text-xs leading-5 text-zinc-500">
          Demi keamanan, ZIP dengan path traversal, arsip terlalu besar, symlink, atau struktur yang tidak valid akan ditolak. Jangan unggah rahasia seperti file <code>.env</code>.
        </div>
      </section>
    </main>
  );
}
