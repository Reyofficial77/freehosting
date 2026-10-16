"use client";

import { useState } from "react";

export default function CopyButton({ value, label = "Salin" }: { value?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    // No value = copy this dashboard page's URL, keeping users inside the app.
    const text = value ?? window.location.href;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="border border-[#333] bg-transparent px-2.5 py-1 text-[11px] text-white transition hover:border-white"
      aria-label={label}
    >
      {copied ? "Tersalin ✓" : label}
    </button>
  );
}
