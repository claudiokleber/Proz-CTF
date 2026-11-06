"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyTextSafe, extractCtfFlag } from "@/lib/clipboard";

interface FlagCopyBadgeProps {
  flag: string;
  label?: string;
  className?: string;
}

export default function FlagCopyBadge({
  flag,
  label,
  className = "",
}: FlagCopyBadgeProps) {
  const [copied, setCopied] = useState(false);
  const cleanFlag = extractCtfFlag(flag);

  async function handleCopy() {
    await copyTextSafe(cleanFlag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-950 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        {label && (
          <span className="block text-[11px] text-slate-400 mb-0.5 font-sans">
            {label}
          </span>
        )}
        <code className="font-mono text-sm font-extrabold text-emerald-300 break-all select-all">
          {cleanFlag}
        </code>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans font-bold text-xs shrink-0 transition ${
          copied
            ? "bg-emerald-500 text-slate-950"
            : "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40"
        }`}
        title="Copiar flag para colar na Plataforma CTF"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Flag Copiada!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copiar Flag
          </>
        )}
      </button>
    </div>
  );
}
