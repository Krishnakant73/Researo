"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowUpRight,
  FileText,
  BookText,
  Zap,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { useReports } from "@/lib/hooks/use-research";
import { formatNumber, formatRelative, truncate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentPipeline } from "@/components/research/agent-pipeline";
import type { DashboardMetrics } from "@/lib/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

export function DashboardView() {
  const { data, isLoading, isError } = useDashboard();
  if (!data) {
    return (
      <div className="mx-auto flex max-w-[1360px] items-center justify-center py-24 text-[13px] text-[color:var(--color-fg-muted)]">
        {isError ? (
          "Couldn't load the dashboard. Is the API running?"
        ) : (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
          </span>
        )}
      </div>
    );
  }
  return (
    <motion.div
      className="mx-auto flex max-w-[1360px] flex-col gap-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <Greeting data={data} />
      <MetricsRow data={data} />
      <ActivityChart data={data} />
      <div className="grid gap-6 md:grid-cols-2">
        <AgentPerf data={data} />
        <CategoryDonut data={data} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <RecentReports data={data} />
        <RecentDocuments data={data} />
      </div>
      <PipelinePreview />
    </motion.div>
  );
}

function Greeting({ data }: { data: DashboardMetrics }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <motion.section variants={item} className="flex items-end justify-between gap-4">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Workspace
        </div>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-white">
          {greeting}, Krishna.
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-fg-dim)]">
          {formatNumber(data.research_count)} researches · {formatNumber(data.document_count)} documents indexed ·{" "}
          <span className="text-[color:var(--color-success)]">
            {Math.round(data.avg_confidence * 100)}%
          </span>{" "}
          avg confidence
        </p>
      </div>
      <Link href="/research">
        <Button variant="primary" size="lg" className="gap-1.5 shadow-[0_10px_40px_-16px_rgba(124,92,255,0.9)]">
          <Sparkles className="h-4 w-4" />
          Start research
        </Button>
      </Link>
    </motion.section>
  );
}

function MetricsRow({ data }: { data: DashboardMetrics }) {
  const researchWeek = data.research_this_week ?? 0;
  const docsWeek = data.documents_this_week ?? 0;
  const cards = [
    {
      label: "Research Sessions",
      value: formatNumber(data.research_count),
      delta: `+${researchWeek} this week`,
      accent: "cyan",
      icon: Sparkles,
    },
    {
      label: "Documents",
      value: formatNumber(data.document_count),
      delta: `+${docsWeek} this week`,
      accent: "accent",
      icon: FileText,
    },
    {
      label: "Confidence",
      value: `${Math.round(data.avg_confidence * 100)}%`,
      delta: `across ${formatNumber(data.research_count)} sessions`,
      accent: "success",
      icon: ShieldCheck,
    },
    {
      label: "Citation Accuracy",
      value: `${Math.round(data.citation_accuracy * 100)}%`,
      delta: "validator average",
      accent: "pink",
      icon: Zap,
    },
  ] as const;
  return (
    <motion.section variants={item} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="group panel relative overflow-hidden p-4 transition-transform hover:-translate-y-[1px]"
          >
            <div className="absolute inset-0 opacity-40 grid-bg" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                  {c.label}
                </div>
                <div className="mt-2 text-[26px] font-semibold tracking-tight text-white">
                  {c.value}
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--color-fg-dim)]">
                  {c.delta}
                </div>
              </div>
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg border ${
                  c.accent === "accent"
                    ? "border-[rgba(124,92,255,0.3)] bg-[color:var(--color-accent-soft)] text-[#c9bcff]"
                    : c.accent === "cyan"
                    ? "border-[rgba(77,208,255,0.3)] bg-[rgba(77,208,255,0.1)] text-[#8fdcff]"
                    : c.accent === "success"
                    ? "border-[rgba(35,192,105,0.3)] bg-[rgba(35,192,105,0.1)] text-[#6fe0a1]"
                    : "border-[rgba(255,119,176,0.3)] bg-[rgba(255,119,176,0.1)] text-[#ffa6cb]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </motion.section>
  );
}

function ActivityChart({ data }: { data: DashboardMetrics }) {
  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Research Activity</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">Last 14 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip chip-accent">Research</span>
          <span className="chip">Documents</span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.activity} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="rc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4dd0ff" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4dd0ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a1c22" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b6f7a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
            />
            <YAxis
              tick={{ fill: "#6b6f7a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={26}
            />
            <RTooltip content={<ChartTip />} cursor={{ stroke: "#2a2e39" }} />
            <Area
              type="monotone"
              dataKey="research"
              stroke="#7c5cff"
              strokeWidth={2}
              fill="url(#rc)"
            />
            <Area
              type="monotone"
              dataKey="documents"
              stroke="#4dd0ff"
              strokeWidth={2}
              fill="url(#dc)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[#0d0e11] px-2 py-1.5 text-[11px] shadow-lg">
      <div className="mb-0.5 text-[color:var(--color-fg-muted)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-[color:var(--color-fg-dim)] capitalize">{p.dataKey}:</span>
          <span className="text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function AgentPerf({ data }: { data: DashboardMetrics }) {
  const router = useRouter();
  const chartData = data.agent_perf.map((a) => ({
    agent: a.agent,
    success: a.success,
    failure: a.failure,
    latency: Math.round(a.avg_ms / 100),
  }));
  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Agent Performance</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">Success and latency · click for analytics</p>
        </div>
        <Link href="/analytics">
          <Button variant="ghost" size="sm" className="gap-1">
            Details <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 6, left: -16, bottom: 0 }}
            onClick={() => router.push("/analytics")}
            className="cursor-pointer"
          >
            <CartesianGrid stroke="#1a1c22" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="agent" tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#6b6f7a", fontSize: 10 }} tickLine={false} axisLine={false} width={22} />
            <RTooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="success" stackId="a" fill="#7c5cff" radius={[3, 3, 0, 0]} />
            <Bar dataKey="failure" stackId="a" fill="#ef4a5c" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

const CATEGORY_COLORS = ["#7c5cff", "#4dd0ff", "#23c069", "#f2b04a", "#ff77b0", "#a1a4ad"];

function CategoryDonut({ data }: { data: DashboardMetrics }) {
  const router = useRouter();
  const dist = data.category_distribution ?? [];
  const total = dist.reduce((s, d) => s + d.value, 0);

  const go = (name: string) =>
    router.push(`/documents?category=${encodeURIComponent(name)}`);

  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Documents by Category</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">
            Click a slice to filter documents
          </p>
        </div>
        <Badge tone="cyan">{formatNumber(total)} total</Badge>
      </div>
      {dist.length === 0 ? (
        <div className="grid h-[200px] place-items-center text-[12px] text-[color:var(--color-fg-muted)]">
          No documents yet.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={200}>
            <PieChart>
              <Pie
                data={dist}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
                onClick={(slice: any) => go(slice?.name ?? slice?.payload?.name)}
                className="cursor-pointer outline-none"
              >
                {dist.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <RTooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-1.5 text-[12px]">
            {dist.map((c, i) => (
              <li key={c.name}>
                <button
                  onClick={() => go(c.name)}
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
    </motion.section>
  );
}

function RecentReports({ data }: { data: DashboardMetrics }) {
  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Recent Reports</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">Latest evidence-backed research</p>
        </div>
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <ul className="divide-y divide-[color:var(--color-border)]">
        {data.recent_research.slice(0, 5).map((r) => (
          <li key={r.id}>
            <Link
              href={`/reports/${r.id}`}
              className="group flex items-center gap-3 py-2.5 pr-1 hover:bg-[color:var(--color-bg-hover)]/40 rounded-md -mx-2 px-2 transition-colors"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg-dim)] group-hover:border-[color:var(--color-accent)] transition-colors">
                <BookText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-white">{r.title}</div>
                <div className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
                  {truncate(r.question, 90)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.status === "completed" ? (
                  <Badge tone="success">{Math.round(r.confidence * 100)}%</Badge>
                ) : (
                  <Badge tone="warn">
                    <span className="pulse-dot h-1 w-1 rounded-full bg-[color:var(--color-warning)]" />
                    Running
                  </Badge>
                )}
                <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                  {formatRelative(r.started_at)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function RecentDocuments({ data }: { data: DashboardMetrics }) {
  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Recent Documents</h2>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">Uploaded to your workspace</p>
        </div>
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <ul className="space-y-1">
        {data.recent_documents.slice(0, 5).map((d) => (
          <li key={d.id}>
            <Link
              href={`/documents/${d.id}`}
              className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[color:var(--color-bg-hover)] transition-colors"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--color-border)] bg-gradient-to-br from-[rgba(239,74,92,0.06)] to-[rgba(124,92,255,0.06)] text-[color:var(--color-fg-dim)]">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-white">{d.name}</div>
                <div className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
                  {d.pages} pages · {d.chunks} chunks · {d.category ?? "General"}
                </div>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

const PIPELINE_ORDER = [
  "Planner",
  "Retriever",
  "Ranker",
  "Curator",
  "Analyst",
  "Validator",
  "Publisher",
];

function PipelinePreview() {
  const { data: reports } = useReports();
  const latest = reports?.[0];
  const steps =
    latest && latest.agents.length
      ? latest.agents
      : PIPELINE_ORDER.map((a) => ({ agent: a, status: "waiting" as const }));
  const totalTokens = latest
    ? latest.agents.reduce((acc, a) => acc + (a.tokens ?? 0), 0)
    : 0;

  return (
    <motion.section variants={item} className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-white">Research Pipeline</h2>
          <p className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
            {latest
              ? `Latest run · ${latest.title}`
              : "Run your first research to see the live pipeline"}
          </p>
        </div>
        {latest && (
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" />
              {Math.round(latest.confidence * 100)}%
            </Badge>
            {totalTokens > 0 && (
              <span className="hidden text-[11px] text-[color:var(--color-fg-muted)] sm:inline">
                {formatNumber(totalTokens)} tokens
              </span>
            )}
            <Link href={`/reports/${latest.id}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                Open <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </div>
      <AgentPipeline steps={steps} compact />
    </motion.section>
  );
}
