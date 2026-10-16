import Link from "next/link";

const steps = [
  {
    n: "01",
    title: "Upload arsip ZIP",
    body: "Seret folder proyek yang sudah di-zip. Tidak perlu mengatur server atau build dari awal."
  },
  {
    n: "02",
    title: "Kami deteksi otomatis",
    body: "Framework, build command, dan output directory dikenali secara otomatis sebelum dideploy."
  },
  {
    n: "03",
    title: "Website siap online",
    body: "Pantau proses build hingga aktif, lalu kelola dan perbarui proyek dari satu dashboard."
  }
];

const features = [
  ["Deteksi framework", "Next.js, Vite, Vue, Astro, Nuxt, Angular, dan HTML statis dikenali otomatis."],
  ["Validasi aman", "Arsip berbahaya, symlink, atau terlalu besar ditolak sebelum menyentuh server."],
  ["Status transparan", "Lihat tahap deployment, log build, dan subdomain proyek secara real-time."],
  ["Kelola mandiri", "Ubah nama, subdomain, dan konfigurasi build kapan pun tanpa upload ulang."]
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-[#0b0d10]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="FreeHosting beranda">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-300 text-black">F</span>
            FreeHosting
          </Link>
          <div className="flex items-center gap-2 text-sm text-zinc-400 sm:gap-5">
            <a href="#cara-kerja" className="hidden hover:text-white sm:block">Cara kerja</a>
            <a href="#fitur" className="hidden hover:text-white sm:block">Fitur</a>
            <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:text-white">Dashboard</Link>
            <Link href="/upload" className="rounded-lg bg-sky-300 px-4 py-2 font-semibold text-black transition hover:bg-sky-200">
              Mulai deploy
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_.9fr] md:items-center md:pt-24">
        <div className="fh-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-sky-300" />
            Hosting yang lebih sederhana
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-.04em] sm:text-6xl">
            Dari folder proyek ke <span className="text-sky-300">website online.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            Upload proyek ZIP, tinjau konfigurasi yang terdeteksi, lalu kelola deployment dalam satu dashboard.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/upload" className="rounded-xl bg-sky-300 px-6 py-3 font-semibold text-black transition hover:bg-sky-200">
              Upload proyek
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-zinc-700 px-6 py-3 font-medium transition hover:border-zinc-500">
              Buka dashboard
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
            <li className="flex items-center gap-2"><span className="text-sky-300">✓</span> Tanpa konfigurasi server</li>
            <li className="flex items-center gap-2"><span className="text-sky-300">✓</span> Subdomain per proyek</li>
            <li className="flex items-center gap-2"><span className="text-sky-300">✓</span> Status build transparan</li>
          </ul>
        </div>

        <div className="fh-fade-up rounded-2xl border border-zinc-800 bg-[#101318] p-4">
          <div className="flex items-center justify-between border-b border-zinc-800 px-2 pb-4">
            <div className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <i className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <i className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            </div>
            <span className="text-xs text-zinc-500">deployment overview</span>
          </div>
          <div className="p-4">
            <div className="text-sm text-zinc-400">PROJECT STATUS</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-xl font-semibold">my-awesome-site</span>
              <span className="rounded-full border border-sky-900 bg-sky-950/60 px-2.5 py-1 text-xs text-sky-300">Aktif</span>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-[#0b0d10] p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-zinc-400">Framework terdeteksi</span><span>Next.js</span></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-zinc-400">Build command</span><code className="text-sky-200">npm run build</code></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-zinc-400">Output</span><code>.next</code></div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-sky-300/10 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-300 text-black">↗</span>
              <div>
                <div className="text-sm font-medium">Website siap dipublikasikan</div>
                <div className="mt-1 text-xs text-zinc-400">Satu alur. Status jelas.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="border-t border-zinc-900 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[.2em] text-zinc-500">Cara kerja</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Tiga langkah, satu alur.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(step => (
              <article key={step.n} className="rounded-2xl border border-zinc-800 bg-[#101318] p-6">
                <div className="text-sm font-semibold text-sky-300">{step.n}</div>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="fitur" className="border-t border-zinc-900 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[.2em] text-zinc-500">Fitur</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Dibuat untuk workflow yang simpel.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-zinc-800 p-6">
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Siap mempublikasikan proyekmu?</h2>
            <p className="mt-2 text-sm text-zinc-400">Upload sekarang atau buka dashboard untuk melihat proyek yang sudah ada.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/upload" className="rounded-xl bg-sky-300 px-5 py-3 font-semibold text-black transition hover:bg-sky-200">Upload proyek</Link>
            <Link href="/dashboard" className="rounded-xl border border-zinc-700 px-5 py-3 font-medium transition hover:border-zinc-500">Dashboard</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 px-6 py-8 text-center text-xs text-zinc-600">
        FreeHosting · Publish with confidence
      </footer>
    </main>
  );
}
