// Client-safe helpers for presenting deployment status.
// Monochrome presentation to match the site design; red is kept for errors.
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
      return "border-white bg-white text-black";
    case "warn":
      return "border-[#3a3a3a] text-[#929292]";
    case "err":
      return "border-red-900 text-red-300";
    default:
      return "border-[#333] text-[#777]";
  }
}

export function isTerminal(status: string | null | undefined): boolean {
  return status === "ready" || status === "failed" || status === "cancelled";
}
