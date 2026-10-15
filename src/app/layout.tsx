import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FreeHosting — Publish your website",
  description: "Deploy websites from a ZIP archive with a simple workflow."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}