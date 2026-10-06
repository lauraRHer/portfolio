"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Copies the email to the clipboard and morphs the icon into a check for 1.5s. */
export function CopyEmailButton({ label, copiedLabel, className }: { label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.location.href = `mailto:${siteConfig.email}`;
    }
  };

  return (
    <button type="button" onClick={copy} className={cn("inline-flex items-center gap-2", className)} aria-live="polite">
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? copiedLabel : label}
    </button>
  );
}
