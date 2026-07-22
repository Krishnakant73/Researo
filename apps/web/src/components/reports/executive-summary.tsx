"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Volume2,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Report } from "@/lib/types";
import { readingTimeMinutes } from "@/lib/reports/metrics";
import { cn } from "@/lib/utils";

export function ExecutiveSummary({ report }: { report: Report }) {
  const text = report.executive_summary || report.summary || "";
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const minutes = readingTimeMinutes(text);
  const isLong = text.length > 420;

  // Stop any narration when unmounting or navigating away.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Summary copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const toggleListen = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech isn't supported in this browser");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  return (
    <div className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-white">Executive summary</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] text-[color:var(--color-fg-muted)]">
            <Clock className="h-2.5 w-2.5" /> {minutes} min read
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(35,192,105,0.12)] px-2 py-0.5 text-[10.5px] text-[color:var(--color-success)]">
            <ShieldCheck className="h-2.5 w-2.5" /> {Math.round(report.confidence * 100)}% confidence
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label={copied ? "Copied" : "Copy"} onClick={copy} active={copied}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn label={speaking ? "Stop" : "Listen"} onClick={toggleListen} active={speaking}>
            {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </IconBtn>
        </div>
      </div>

      <p
        className={cn(
          "text-[13.5px] leading-relaxed text-[color:var(--color-fg-dim)]",
          !expanded && isLong && "line-clamp-4"
        )}
      >
        {text}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-accent)] hover:underline"
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] transition-colors",
        active
          ? "border-[rgba(124,92,255,0.4)] bg-[color:var(--color-accent-soft)] text-white"
          : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
