"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import { Topbar } from "@/components/shell/topbar";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { DashboardMetrics } from "@/lib/types";

const CATEGORY_COLORS = ["#7c5cff", "#4dd0ff", "#23c069", "#f2b04a", "#ff77b0"];

export default function AnalyticsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useDashboard();
  if (!data) {
    return (
      <>
        <Topbar title="Analytics" subtitle="Research quality, cost and throughput" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid place-items-center py-24 text-[13px] text-[color:var(--color-fg-muted)]">
            {isError
              ? "Couldn't load analytics. Is the API running?"
              : isLoading
              ? "Loading analytics…"
              : ""}
          </div>
        </main>
      </>
    );
  }

  // Real per-day confidence (skip empty days so the trend line stays clean).
  const confidenceTrend = data.activity.map((a) => ({
    date: a.date,
    confidence: a.confidence ? a.confidence : null,
  }));

  const latency = data.agent_perf.map((a) => ({
    agent: a.agent,
    ms: a.avg_ms,
  }));

  // Real per-day token usage; cost derived from the overall cost/token rate.
  const rate =
    data.total_tokens > 0 ? data.total_cost_usd / data.total_tokens : 0;
  const costTrend = data.activity.map((a) => {
    const tokens = a.tokens ?? 0;
    return {
      date: a.date,
      tokens,
      cost: Number((tokens * rate).toFixed(2)),
    };
  });

  const docsByCat = data.category_distribution ?? [];
  const totalDocs = docsByCat.reduce((s, d) => s + d.value, 0);

  const goCategory = (name?: string) => {
    if (name) router.push(`/documents?category=${encodeURIComponent(name)}`);
  };

  return (
    <>
      <Topbar title="Analytics" subtitle="Research quality, cost and throughput" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4">
          <KPIRow data={data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Confidence Trend"
              subtitle="Mean report confidence"
              badge={<Badge tone="success">{Math.round(data.avg_confidence * 100)}% avg</Badge>}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={confidenceTrend} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="conf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#23c069" stopOpacity={0.36} />
                      <stop offset="100%" stopColor="#23c069" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1a1c22" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} width={26} domain={[0, 100]} />
                  <RTooltip content={<Tip />} />
                  <Area dataKey="confidence" stroke="#23c069" strokeWidth={2} fill="url(#conf)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Agent Latency"
              subtitle="Average duration per agent (ms)"
              badge={<Badge tone="accent">{latency.length ? `${Math.round(Math.max(...latency.map((l) => l.ms)))}ms peak` : "no data"}</Badge>}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={latency} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#1a1c22" vertical={false} />
                  <XAxis dataKey="agent" tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                  <RTooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="ms" fill="#4dd0ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Token Usage & Cost"
              subtitle="Daily tokens and estimated cost"
              badge={<Badge tone="pink">${data.total_cost_usd.toFixed(2)} total</Badge>}
            >
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={costTrend} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tok" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.36} />
                      <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1a1c22" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <RTooltip content={<Tip />} />
                  <Area dataKey="tokens" stroke="#7c5cff" strokeWidth={2} fill="url(#tok)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Documents by Category"
              subtitle="Click a slice to filter documents"
              badge={<Badge tone="cyan">{totalDocs} total</Badge>}
            >
              {docsByCat.length === 0 ? (
                <div className="grid h-[220px] place-items-center text-[12px] text-[color:var(--color-fg-muted)]">
                  No documents yet.
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie
                        data={docsByCat}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={44}
                        outerRadius={82}
                        paddingAngle={2}
                        strokeWidth={0}
                        onClick={(slice: any) => goCategory(slice?.name ?? slice?.payload?.name)}
                        className="cursor-pointer outline-none"
                      >
                        {docsByCat.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-1.5 text-[12px]">
                    {docsByCat.map((c, i) => (
                      <li key={c.name}>
                        <button
                          onClick={() => goCategory(c.name)}
                          className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-[color:var(--color-bg-hover)] transition-colors"
                        >
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                          <span className="flex-1 truncate text-[color:var(--color-fg-dim)]">{c.name}</span>
                          <span className="text-white">{c.value}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      </main>
    </>
  );
}

function KPIRow({ data }: { data: DashboardMetrics }) {
  const last7 = data.activity.slice(-7);
  const tokens7 = last7.reduce((s, a) => s + (a.tokens ?? 0), 0);
  const rate = data.total_tokens > 0 ? data.total_cost_usd / data.total_tokens : 0;
  const cost7 = tokens7 * rate;
  const lats = data.agent_perf.map((a) => a.avg_ms).filter((x) => x > 0).sort((a, b) => a - b);
  const med = lats.length ? lats[Math.floor(lats.length / 2)] : 0;
  const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  const kpis = [
    {
      label: "Total Tokens",
      value: `${(data.total_tokens / 1_000_000).toFixed(2)}M`,
      delta: `+${fmtK(tokens7)} this week`,
    },
    {
      label: "Total Cost",
      value: `$${data.total_cost_usd.toFixed(2)}`,
      delta: `+$${cost7.toFixed(2)} this week`,
    },
    {
      label: "Median Agent Latency",
      value: med ? `${(med / 1000).toFixed(2)}s` : "—",
      delta: "across agents",
    },
    {
      label: "Avg Confidence",
      value: `${Math.round(data.avg_confidence * 100)}%`,
      delta: `${formatNumber(data.research_count)} sessions`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-4"
        >
          <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            {k.label}
          </div>
          <div className="mt-2 text-[22px] font-semibold text-white">{k.value}</div>
          <div className="mt-0.5 text-[11px] text-[color:var(--color-fg-dim)]">{k.delta}</div>
        </motion.div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">{title}</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">{subtitle}</p>
        </div>
        {badge}
      </div>
      {children}
    </motion.div>
  );
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[#0d0e11] px-2 py-1.5 text-[11px] shadow-lg">
      {label && <div className="mb-0.5 text-[color:var(--color-fg-muted)]">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-[color:var(--color-fg-dim)] capitalize">
            {p.name ?? p.dataKey}:
          </span>
          <span className="text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
