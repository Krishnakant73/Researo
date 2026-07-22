"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  FlaskConical,
  FileText,
  BookText,
  BarChart3,
  Network,
  Quote,
  Settings,
  Sparkles,
  ChevronRight,
  FolderKanban,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWorkspaces,
  useActiveWorkspaceId,
  useWorkspaceStore,
} from "@/lib/hooks/use-workspace";
import { useResearchList } from "@/lib/hooks/use-research";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { DEFAULT_WORKSPACE_ID } from "@/lib/api";

const NAV_MAIN = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/research", label: "Research", icon: FlaskConical, accent: true },
  { href: "/search", label: "Search", icon: Search },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BookText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
  { href: "/citations", label: "Citations", icon: Quote },
  { href: "/workspaces", label: "Workspaces", icon: FolderKanban },
];

const NAV_BOTTOM = [{ href: "/settings", label: "Settings", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const { desktopOpen, mobileOpen, closeMobile } = useSidebar();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "flex h-svh w-[260px] shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[#0a0b0e]/95 backdrop-blur",
          // Mobile: off-canvas drawer
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: in-flow, collapsible
          "lg:static lg:z-10 lg:w-[240px] lg:translate-x-0 lg:transition-none lg:bg-[#0a0b0e]/80",
          desktopOpen ? "lg:flex" : "lg:hidden"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#4dd0ff] shadow-[0_6px_16px_-6px_rgba(124,92,255,0.6)] grid place-items-center">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-tight text-white">
              Researo
            </span>
            <span className="text-[10px] text-[color:var(--color-fg-muted)] font-medium tracking-wider uppercase">
              Evidence Intelligence
            </span>
          </div>
          {/* Close (mobile only) */}
          <button
            onClick={closeMobile}
            aria-label="Close menu"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-hover)] hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      {/* Workspace selector */}
      <WorkspaceSelector />

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="mb-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {NAV_MAIN.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                    active
                      ? "text-white bg-[rgba(124,92,255,0.12)]"
                      : "text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="side-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[color:var(--color-accent)]"
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-[color:var(--color-accent)]"
                        : item.accent
                        ? "text-[#4dd0ff]"
                        : "text-[color:var(--color-fg-muted)] group-hover:text-white"
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <RecentResearch />
      </nav>

      {/* Bottom */}
      <div className="border-t border-[color:var(--color-border)] p-2">
        <ul>
          {NAV_BOTTOM.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                    active
                      ? "text-white bg-[color:var(--color-bg-hover)]"
                      : "text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 text-[color:var(--color-fg-muted)]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]/60 p-2.5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#ff77b0] to-[#7c5cff] text-[11px] font-semibold text-white">
              K
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[12px] font-medium">Krishna</div>
              <div className="truncate text-[10px] text-[color:var(--color-fg-muted)]">
                krishna@researo.ai
              </div>
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}

function RecentResearch() {
  const { data: sessions } = useResearchList();
  const recent = (sessions ?? []).slice(0, 5);

  return (
    <>
      <div className="mt-5 mb-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Recent Research
      </div>
      {recent.length === 0 ? (
        <div className="px-2 py-1.5 text-[11.5px] text-[color:var(--color-fg-muted)]">
          No research yet.
        </div>
      ) : (
        <ul className="space-y-0.5">
          {recent.map((r) => {
            const done = r.status === "completed";
            return (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  title={r.question || r.title}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white transition-colors"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      done
                        ? "bg-[color:var(--color-success)]"
                        : r.status === "failed"
                        ? "bg-[color:var(--color-danger)]"
                        : "bg-[color:var(--color-warning)] pulse-dot"
                    )}
                  />
                  <span className="truncate">{r.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function WorkspaceSelector() {
  const { data: workspaces } = useWorkspaces();
  const activeId = useActiveWorkspaceId();
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);

  // If the persisted active workspace no longer exists (e.g. it was deleted),
  // fall back to the default so documents/research aren't silently scoped to a
  // missing workspace and appear empty.
  useEffect(() => {
    if (
      workspaces &&
      workspaces.length > 0 &&
      !workspaces.some((w) => w.id === activeId)
    ) {
      setActiveId(DEFAULT_WORKSPACE_ID);
    }
  }, [workspaces, activeId, setActiveId]);

  const active =
    workspaces?.find((w) => w.id === activeId) ?? workspaces?.[0];

  const label = active?.name ?? "Workspace";
  const avatar = (active?.color || active?.name?.[0] || "W").slice(0, 2);
  const sub = active
    ? `${active.plan} · ${active.document_count} docs`
    : "Manage workspaces";

  return (
    <Link
      href="/workspaces"
      className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]/80 px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--color-bg-hover)]"
    >
      <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-[#7c5cff] to-[#ff77b0] text-[11px] font-semibold text-white">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-[12px] font-medium text-[color:var(--color-fg)]">
          {label}
        </div>
        <div className="truncate text-[10px] text-[color:var(--color-fg-muted)]">
          {sub}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
    </Link>
  );
}
