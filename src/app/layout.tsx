import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FreeHosting — Publish your website",
    template: "%s · FreeHosting"
  },
  description:
    "Deploy websites from a ZIP archive in minutes. Validate, detect the framework automatically, and publish to your own subdomain.",
  applicationName: "FreeHosting"
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
