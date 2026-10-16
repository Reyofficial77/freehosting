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
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-[68px] items-center justify-between border-b border-[#292929] px-[clamp(20px,5vw,72px)]">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="FreeHosting beranda">
          <span className="grid h-[27px] w-[27px] place-items-center border border-white text-[13px] font-extrabold">F</span>
          <span>FreeHosting</span>
        </Link>
        <nav className="flex items-center gap-5 text-xs text-[#929292]">
          <a href="#cara-kerja" className="hidden hover:text-white sm:block">Cara kerja</a>
          <a href="#fitur" className="hidden hover:text-white sm:block">Fitur</a>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link href="/upload" className="bg-white px-4 py-2.5 font-semibold text-black transition hover:bg-[#ddd]">
            Mulai deploy
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[850px] px-[22px] pb-14 pt-[58px]">
        <p className="mb-[14px] text-[11px] uppercase tracking-[2px] text-[#929292]">Hosting yang lebih sederhana</p>
        <h1 className="text-[clamp(30px,5vw,45px)] font-semibold leading-[1.08] tracking-[-2px]">
          Dari folder proyek<br />ke website online.
        </h1>
        <p className="mb-[34px] mt-[15px] max-w-[540px] text-sm leading-[1.7] text-[#929292]">
          Upload proyek ZIP, tinjau konfigurasi yang terdeteksi, lalu kelola deployment dalam satu dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/upload" className="bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ddd]">
            Upload proyek
          </Link>
          <Link href="/dashboard" className="border border-[#3a3a3a] px-6 py-3 text-sm font-medium transition hover:border-white">
            Buka dashboard
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#929292]">
          <li className="flex items-center gap-2"><span className="text-white">✓</span> Tanpa konfigurasi server</li>
          <li className="flex items-center gap-2"><span className="text-white">✓</span> Subdomain per proyek</li>
          <li className="flex items-center gap-2"><span className="text-white">✓</span> Status build transparan</li>
        </ul>

        <div className="mt-12 border border-[#292929] p-4">
          <div className="flex items-center justify-between border-b border-[#292929] px-2 pb-4">
            <div className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
            </div>
            <span className="text-xs text-[#666]">deployment overview</span>
          </div>
          <div className="p-4">
            <div className="text-xs uppercase tracking-[2px] text-[#929292]">Project status</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-xl font-semibold">my-awesome-site</span>
              <span className="border border-white bg-white px-2.5 py-1 text-xs text-black">Aktif</span>
            </div>
            <div className="mt-6 border border-[#292929] bg-[#080808] p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#929292]">Framework terdeteksi</span><span>Next.js</span></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-[#929292]">Build command</span><code className="text-white">npm run build</code></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-[#929292]">Output</span><code>.next</code></div>
            </div>
            <div className="mt-4 flex items-center gap-3 border border-[#292929] bg-[#0a0a0a] p-4">
              <span className="grid h-9 w-9 place-items-center bg-white text-black">↗</span>
              <div>
                <div className="text-sm font-medium">Website siap dipublikasikan</div>
                <div className="mt-1 text-xs text-[#929292]">Satu alur. Status jelas.</div>
              </div>
            </div>
          </div>
        </div>

        <section id="cara-kerja" className="mt-14 scroll-mt-20">
          <p className="text-[11px] uppercase tracking-[2px] text-[#929292]">Cara kerja</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Tiga langkah, satu alur.</h2>
          <div className="mt-6 grid gap-[14px] sm:grid-cols-3">
            {steps.map(step => (
              <article key={step.n} className="border border-[#292929] p-6">
                <div className="text-xs font-medium text-white">{step.n}</div>
                <h3 className="mt-6 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-[#929292]">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="fitur" className="mt-14 scroll-mt-20">
          <p className="text-[11px] uppercase tracking-[2px] text-[#929292]">Fitur</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Dibuat untuk workflow yang simpel.</h2>
          <div className="mt-6 grid gap-[14px] sm:grid-cols-2">
            {features.map(([title, body]) => (
              <article key={title} className="border border-[#292929] p-6">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-[#929292]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 border border-[#292929] p-6">
          <h2 className="text-xl font-semibold tracking-tight">Siap mempublikasikan proyekmu?</h2>
          <p className="mt-2 text-xs leading-6 text-[#929292]">Upload sekarang atau buka dashboard untuk melihat proyek yang sudah ada.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/upload" className="bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ddd]">Upload proyek</Link>
            <Link href="/dashboard" className="border border-[#3a3a3a] px-5 py-3 text-sm font-medium transition hover:border-white">Dashboard</Link>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-[#292929] px-[clamp(20px,5vw,72px)] py-5 text-[10px] text-[#777]">
        <span>© 2026 <strong className="font-medium text-[#aaa]">FreeHosting</strong></span>
        <span>Built for developers. Kept simple.</span>
      </footer>
    </div>
  );
}
