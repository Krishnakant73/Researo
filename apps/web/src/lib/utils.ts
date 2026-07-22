import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Parse an ISO timestamp, treating a value with no timezone designator as UTC
 * (the backend stores UTC). Without this, "2026-07-21T19:34:44" is parsed as
 * local time and a just-updated item shows as hours ago.
 */
export function parseDate(iso: string): Date {
  if (iso && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) && iso.includes("T")) {
    return new Date(`${iso}Z`);
  }
  return new Date(iso);
}

export function formatRelative(iso: string) {
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  // Deterministic, locale- and timezone-independent (UTC) so the SSR and
  // client renders always match — toLocaleDateString(undefined, ...) picked
  // the runtime locale and caused a "Nov 14" vs "14 Nov" hydration mismatch.
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
