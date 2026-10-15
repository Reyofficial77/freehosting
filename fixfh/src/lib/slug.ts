const reserved = new Set(["www", "api", "admin", "dashboard", "upload", "status", "help", "mail", "ftp", "host", "freehost"]);
export function slugify(value: string) {
  const slug = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  if (!slug || reserved.has(slug)) throw new Error("Nama proyek tidak valid atau dicadangkan.");
  return slug;
}