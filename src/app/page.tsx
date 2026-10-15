import Link from "next/link";

const features = [
  ["01", "Upload, lalu publish", "Mulai dari arsip ZIP tanpa perlu memahami proses deployment."],
  ["02", "Deteksi framework", "Kenali Next.js, Vite, Vue, Astro, dan HTML statis secara otomatis."],
  ["03", "Kelola dari satu tempat", "Pantau status proyek dan deployment melalui dashboard sederhana."]
];

export default function Home() {
  return <main className="min-h-screen">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-300 text-black">F</span> FreeHosting</Link>
      <div className="flex items-center gap-5 text-sm text-zinc-400"><a href="#fitur" className="hidden sm:block hover:text-white">Fitur</a><Link href="/dashboard" className="hover:text-white">Dashboard</Link><Link href="/upload" className="rounded-lg bg-sky-300 px-4 py-2 font-semibold text-black hover:bg-sky-200">Mulai deploy ↗</Link></div>
    </nav>
    <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-16 md:grid-cols-[1.15fr_.85fr] md:items-center md:pt-24">
      <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"><span className="h-2 w-2 rounded-full bg-sky-300"/> Hosting workflow yang lebih sederhana</div>
        <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-.05em] sm:text-7xl">Dari folder proyek ke <span className="text-sky-300">website online.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">Upload proyek ZIP, tinjau konfigurasi yang terdeteksi, lalu kelola deployment dalam satu dashboard.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/upload" className="rounded-xl bg-sky-300 px-5 py-3 font-semibold text-black hover:bg-sky-200">Upload proyek <span className="ml-3">↗</span></Link><Link href="/dashboard" className="rounded-xl border border-zinc-700 px-5 py-3 font-medium hover:border-zinc-500">Buka dashboard</Link></div>
        <p className="mt-5 text-xs text-zinc-500">MVP — batas kuota dan dukungan provider mengikuti konfigurasi deployment.</p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-[#101318] p-4">
        <div className="flex items-center justify-between border-b border-zinc-800 px-2 pb-4"><div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-zinc-700"/><i className="h-2.5 w-2.5 rounded-full bg-zinc-700"/><i className="h-2.5 w-2.5 rounded-full bg-zinc-700"/></div><span className="text-xs text-zinc-500">deployment overview</span></div>
        <div className="p-4"><div className="text-sm text-zinc-400">PROJECT STATUS</div><div className="mt-2 flex items-center justify-between"><span className="text-xl font-semibold">my-awesome-site</span><span className="rounded-full border border-sky-900 bg-sky-950/60 px-2.5 py-1 text-xs text-sky-300">Ready</span></div>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-[#0b0d10] p-4"><div className="flex items-center justify-between text-sm"><span className="text-zinc-400">Framework detected</span><span>Next.js</span></div><div className="mt-4 flex items-center justify-between text-sm"><span className="text-zinc-400">Build command</span><code className="text-sky-200">npm run build</code></div><div className="mt-4 flex items-center justify-between text-sm"><span className="text-zinc-400">Output</span><code>.next</code></div></div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-sky-300/10 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-300 text-black">↗</span><div><div className="text-sm font-medium">Website siap dipublikasikan</div><div className="mt-1 text-xs text-zinc-400">Satu alur. Status jelas.</div></div></div>
        </div>
      </div>
    </section>
    <section id="fitur" className="border-t border-zinc-900"><div className="mx-auto max-w-6xl px-6 py-16"><div className="mb-8 text-xs uppercase tracking-[.2em] text-zinc-500">Dibuat untuk workflow yang simpel</div><div className="grid gap-4 md:grid-cols-3">{features.map(([n,t,d])=><article key={n} className="rounded-2xl border border-zinc-800 p-6"><div className="text-sm text-sky-300">{n}</div><h2 className="mt-8 text-lg font-semibold">{t}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{d}</p></article>)}</div></div></section>
    <footer className="border-t border-zinc-900 px-6 py-7 text-center text-xs text-zinc-600">FreeHosting · Publish with confidence</footer>
  </main>;
}