export default function Loading() {
  return (
    <main className="mx-auto max-w-[850px] bg-black px-[22px] py-16 text-white">
      <div className="flex items-center gap-3 text-xs text-[#929292]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#333] border-t-white" aria-hidden />
        Memuat…
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map(row => (
          <div key={row} className="h-16 animate-pulse border border-[#292929] bg-[#0a0a0a]" />
        ))}
      </div>
    </main>
  );
}
