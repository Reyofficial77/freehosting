// Client-safe helpers for presenting deployment status (PRD section 9).
export const statusLabels: Record<string, string> = {
  uploaded: "Terunggah",
  validating: "Memvalidasi",
  detected: "Terdeteksi",
  queued: "Dalam antrean",
  deploying: "Menghubungkan",
  building: "Membangun",
  assigning_domain: "Menghubungkan domain",
  ready: "Aktif",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  deleting: "Menghapus"
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Belum ada";
  return statusLabels[status] || status;
}

export type StatusTone = "ok" | "warn" | "err" | "muted";

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "muted";
  if (status === "ready") return "ok";
  if (status === "failed" || status === "cancelled") return "err";
  if (status === "deleting") return "warn";
  return "warn";
}

export function toneClasses(tone: StatusTone): string {
  switch (tone) {
    case "ok":
      return "border-emerald-900 bg-emerald-950/50 text-emerald-300";
    case "warn":
      return "border-amber-900 bg-amber-950/40 text-amber-200";
    case "err":
      return "border-red-900 bg-red-950/40 text-red-200";
    default:
      return "border-zinc-800 bg-zinc-900/60 text-zinc-300";
  }
}

export function isTerminal(status: string | null | undefined): boolean {
  return status === "ready" || status === "failed" || status === "cancelled";
}
