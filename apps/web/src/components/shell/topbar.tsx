"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Command, Sparkles, Bell, Menu, PanelLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/shell/command-palette";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { useResearchList } from "@/lib/hooks/use-research";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { formatRelative } from "@/lib/utils";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [openPalette, setOpenPalette] = useState(false);
  const { openMobile, toggleDesktop } = useSidebar();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-bg)]/70">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        {/* Sidebar toggles */}
        <button
          onClick={openMobile}
          aria-label="Open menu"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={toggleDesktop}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-md text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white lg:grid"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          {title && (
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="truncate text-[13.5px] font-semibold text-white"
            >
              {title}
            </motion.h1>
          )}
          {subtitle && (
            <p className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Full search (tablet/desktop) */}
        <button
          onClick={() => setOpenPalette(true)}
          className="group hidden h-8 min-w-[220px] items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2.5 text-[12px] text-[color:var(--color-fg-muted)] transition-colors hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-fg-dim)] md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search or ask anything</span>
          <span className="flex items-center gap-0.5">
            <kbd className="kbd inline-flex items-center gap-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </span>
        </button>

        {/* Compact search (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          title="Search"
          onClick={() => setOpenPalette(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        <NotificationsBell />

        <Link href="/research">
          <Button variant="primary" size="md" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Research</span>
          </Button>
        </Link>
      </div>

      <CommandPalette open={openPalette} onOpenChange={setOpenPalette} />
    </header>
  );
}

export function TopbarSimple({ title }: { title: string }) {
  return <Topbar title={title} />;
}

const NOTIF_SEEN_KEY = "researo:notifications-seen";

function NotificationsBell() {
  const router = useRouter();
  const { data: sessions } = useResearchList();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_SEEN_KEY);
      if (raw) setLastSeen(parseInt(raw, 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const recent = (sessions ?? []).slice(0, 8);
  // Unread = sessions that completed/updated after the last time the user
  // opened the panel.
  const unread = recent.filter((r) => {
    const t = new Date(r.completed_at || r.started_at).getTime();
    return t > lastSeen;
  }).length;

  const markSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(NOTIF_SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) markSeen();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          title="Notifications"
          className="relative hidden h-8 w-8 place-items-center rounded-md text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white sm:grid"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[color:var(--color-accent)] px-0.5 text-[8px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] p-0">
        <DropdownMenuLabel className="px-3 py-2">Activity</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        {recent.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] text-[color:var(--color-fg-muted)]">
            No research activity yet.
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto py-1">
            {recent.map((r) => {
              const done = r.status === "completed";
              const failed = r.status === "failed";
              const Icon = done ? CheckCircle2 : failed ? XCircle : Loader2;
              return (
                <DropdownMenuItem
                  key={r.id}
                  onClick={() => router.push(`/reports/${r.id}`)}
                  className="items-start gap-2 px-3 py-2"
                >
                  <Icon
                    className={
                      "mt-0.5 h-3.5 w-3.5 shrink-0 " +
                      (done
                        ? "text-[color:var(--color-success)]"
                        : failed
                        ? "text-[color:var(--color-danger)]"
                        : "animate-spin text-[color:var(--color-warning)]")
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-white">{r.title}</div>
                    <div className="text-[10.5px] text-[color:var(--color-fg-muted)]">
                      {done
                        ? `Completed · ${Math.round(r.confidence * 100)}% confidence`
                        : failed
                        ? "Failed"
                        : "In progress"}{" "}
                      · {formatRelative(r.completed_at || r.started_at)}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
