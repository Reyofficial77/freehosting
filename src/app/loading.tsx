export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-300" aria-hidden />
        Memuat…
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map(row => (
          <div key={row} className="h-16 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/30" />
        ))}
      </div>
    </main>
  );
}
