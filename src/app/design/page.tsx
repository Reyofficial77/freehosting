import DesignPreview from "./design-client";

export const metadata = { title: "Design preview" };

/**
 * Pixel-faithful Next.js conversion of the original single-file mockup
 * (FreeHosting-Design.zip → FreeHosting/index.html). Static UI preview only —
 * the functional version lives at /upload.
 */
export default function DesignPage() {
  return <DesignPreview />;
}
