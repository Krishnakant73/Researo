"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Share2,
  Sparkles,
  FileJson,
  FileText as FileTextIcon,
  MoreHorizontal,
  Copy,
  Network,
  GitFork,
  ClipboardList,
  BookOpen,
  Layers,
  LineChart,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { api } from "@/lib/api";
import { useReport } from "@/lib/hooks/use-research";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { ReportPipeline } from "@/components/reports/report-pipeline";
import { ReportStats } from "@/components/reports/report-stats";
import { ExecutiveSummary } from "@/components/reports/executive-summary";
import { KeyFindings } from "@/components/reports/key-findings";
import { ReportReferences } from "@/components/reports/report-references";
import { EvidencePanel } from "@/components/reports/evidence-panel";
import { ReportQuality } from "@/components/reports/report-quality";
import { ModelRouting } from "@/components/reports/model-routing";
import { ResearchInsights } from "@/components/reports/research-insights";
import { FollowUps } from "@/components/reports/followups";
import { ReportCharts } from "@/components/reports/report-charts";
import { ReasoningTimeline } from "@/components/reports/reasoning-timeline";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: report, isLoading } = useReport(params.id);

  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [railTab, setRailTab] = useState<"overview" | "evidence" | "analytics">("overview");

  // Clicking a citation (in findings or references) highlights the matching
  // evidence and reveals the Evidence tab so the passage scrolls into view.
  const onCite = (id: string) => {
    setActiveCitationId(id);
    setRailTab("evidence");
  };

  if (isLoading) return <ReportSkeleton />;

  if (!report) {
    return (
      <>
        <Topbar title="Report" subtitle="Research report" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1360px]">
            <Link
              href="/reports"
              className="mb-4 inline-flex items-center gap-1 text-[12px] text-[color:var(--color-fg-muted)] hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> Back to reports
            </Link>
            <div className="panel grid place-items-center px-6 py-16 text-center">
              <p className="text-[13px] text-[color:var(--color-fg-dim)]">Report not found.</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const logExport = (format: string) => {
    // Fire-and-forget audit log; never blocks or breaks the export itself.
    api.post(`/api/v1/reports/${params.id}/exports`, { format }).catch(() => {});
  };

  const onExport = (kind: "markdown" | "json" | "pdf") => {
    if (kind === "markdown") {
      downloadBlob(report.markdown, "text/markdown", `${slug(report.title)}.md`);
    } else if (kind === "json") {
      downloadBlob(JSON.stringify(report, null, 2), "application/json", `${slug(report.title)}.json`);
    } else {
      window.print();
    }
    logExport(kind);
    toast.success(`Exported ${kind.toUpperCase()}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    logExport("share");
    toast.success("Link copied");
  };
  const copySummary = () => {
    navigator.clipboard.writeText(report.executive_summary || report.summary || "");
    toast.success("Summary copied");
  };

  const uniqueSources = new Set([
    ...report.citations.map((c) => c.document_id),
    ...report.evidence.map((e) => e.document_id),
  ]).size;

  return (
    <>
      <Topbar title={report.title} subtitle="Research report" />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <Link
            href="/reports"
            className="no-print mb-4 inline-flex items-center gap-1 text-[12px] text-[color:var(--color-fg-muted)] hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Back to reports
          </Link>

          {/* Header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                Research report
              </div>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-white">
                {report.title}
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] text-[color:var(--color-fg-dim)]">
                {report.question}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="success">{Math.round(report.confidence * 100)}% confidence</Badge>
                <Badge tone="accent">{report.key_findings.length} findings</Badge>
                <Badge tone="cyan">{report.citations.length} citations</Badge>
                <Badge tone="pink">{uniqueSources} sources</Badge>
              </div>
            </div>

            {/* Toolbar */}
            <div className="no-print flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="md" onClick={() => onExport("pdf")} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="secondary" size="md" onClick={() => onExport("markdown")} className="gap-1.5">
                <FileTextIcon className="h-3.5 w-3.5" /> Markdown
              </Button>
              <Button variant="secondary" size="md" onClick={() => onExport("json")} className="gap-1.5">
                <FileJson className="h-3.5 w-3.5" /> JSON
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More actions" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuItem onClick={copyLink}>
                    <Share2 className="h-3.5 w-3.5" /> Copy share link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copySummary}>
                    <Copy className="h-3.5 w-3.5" /> Copy summary
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/research?q=${encodeURIComponent(report.question)}`)}
                  >
                    <GitFork className="h-3.5 w-3.5" /> Re-run research
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/graph")}>
                    <Network className="h-3.5 w-3.5" /> Open knowledge graph
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/research">
                <Button variant="primary" size="md" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> New research
                </Button>
              </Link>
            </div>
          </div>

          {/* Pipeline + stats */}
          <div className="no-print space-y-3">
            <ReportPipeline report={report} />
            <ReportStats report={report} />
          </div>

          {/* Body */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <ExecutiveSummary report={report} />
              <KeyFindings report={report} activeCitationId={activeCitationId} onCite={onCite} />

              {report.contradictions.length > 0 && (
                <ProseCard title="Contradictions" icon={ClipboardList} tone="warning">
                  <ul className="ml-4 list-disc space-y-1.5 text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
                    {report.contradictions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </ProseCard>
              )}

              {report.methodology && (
                <ProseCard title="Methodology" icon={ClipboardList}>
                  <p className="text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
                    {report.methodology}
                  </p>
                </ProseCard>
              )}

              {report.recommendations.length > 0 && (
                <ProseCard title="Recommendations" icon={BookOpen}>
                  <ol className="ml-4 list-decimal space-y-1.5 text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
                    {report.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </ProseCard>
              )}

              <ReportReferences report={report} activeCitationId={activeCitationId} onCite={onCite} />
            </div>

            {/* Right rail */}
            <div className="no-print space-y-4">
              <Tabs value={railTab} onValueChange={(v) => setRailTab(v as typeof railTab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1 justify-center">
                    <Sparkles className="h-3 w-3" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="flex-1 justify-center">
                    <Layers className="h-3 w-3" /> Evidence
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex-1 justify-center">
                    <LineChart className="h-3 w-3" /> Analytics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <ReportQuality report={report} />
                  <ResearchInsights report={report} />
                  <ModelRouting report={report} />
                  <FollowUps report={report} />
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <EvidencePanel report={report} activeCitationId={activeCitationId} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-4 space-y-4">
                  <ReportCharts report={report} />
                  <ReasoningTimeline report={report} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ProseCard({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "warning";
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-1.5">
        <Icon
          className={
            tone === "warning"
              ? "h-3.5 w-3.5 text-[color:var(--color-warning)]"
              : "h-3.5 w-3.5 text-[color:var(--color-fg-muted)]"
          }
        />
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(title: string): string {
  return title.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "report";
}

function ReportSkeleton() {
  return (
    <>
      <Topbar title="Report" subtitle="Loading research report…" />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-64" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
