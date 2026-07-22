"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Topbar } from "@/components/shell/topbar";
import { useReports } from "@/lib/hooks/use-research";
import { useDocuments } from "@/lib/hooks/use-documents";
import { truncate, cn } from "@/lib/utils";
import { FileText, FlaskConical, Lightbulb, Network } from "lucide-react";

const TYPE_STYLE: Record<
  string,
  { border: string; bg: string; icon: any; label: string; mini: string }
> = {
  research: {
    border: "border-[rgba(124,92,255,0.5)]",
    bg: "bg-[rgba(124,92,255,0.14)]",
    icon: FlaskConical,
    label: "Research",
    mini: "#7c5cff",
  },
  finding: {
    border: "border-[rgba(255,119,176,0.45)]",
    bg: "bg-[rgba(255,119,176,0.12)]",
    icon: Lightbulb,
    label: "Finding",
    mini: "#ff77b0",
  },
  document: {
    border: "border-[rgba(77,208,255,0.45)]",
    bg: "bg-[rgba(77,208,255,0.12)]",
    icon: FileText,
    label: "Document",
    mini: "#4dd0ff",
  },
};

function GraphNode({ data }: { data: any }) {
  const s = TYPE_STYLE[data.type] ?? TYPE_STYLE.document;
  const Icon = s.icon;
  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0" />
      <div
        className={cn(
          "flex max-w-[240px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 shadow-md backdrop-blur transition-transform hover:scale-[1.03]",
          s.border,
          s.bg
        )}
      >
        <Icon className="h-3 w-3 shrink-0 text-white" />
        <span className="truncate text-[12px] font-medium text-white">{data.label}</span>
        {typeof data.confidence === "number" && (
          <span className="ml-auto shrink-0 rounded bg-black/30 px-1 text-[9.5px] font-medium text-white/80">
            {Math.round(data.confidence * 100)}%
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0" />
    </>
  );
}

const nodeTypes = { rn: GraphNode };

const COL = { research: 40, finding: 420, document: 820 };

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const { data: reports } = useReports();
  const { data: documents } = useDocuments();

  const { nodes, edges, counts } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];
    const mkEdge = (animated: boolean, label?: string) => ({
      animated,
      label,
      style: { stroke: animated ? "#7c5cff" : "#2a2e39", strokeWidth: animated ? 1.4 : 1 },
      labelStyle: { fill: "#6b6f7a", fontSize: 10 },
      markerEnd: { type: MarkerType.ArrowClosed, color: animated ? "#7c5cff" : "#3a3f4b" },
    });

    const reps = (reports ?? []).slice(0, 6);
    const docY: Record<string, number> = {};
    let docIdx = 0;
    let findingIdx = 0;

    const ensureDoc = (id: string, name: string) => {
      const nid = `doc:${id}`;
      if (!(nid in docY)) {
        docY[nid] = docIdx;
        rfNodes.push({
          id: nid,
          type: "rn",
          position: { x: COL.document, y: docIdx * 68 + 30 },
          data: { label: truncate(name || id, 24), type: "document", href: `/documents/${id}` },
        });
        docIdx += 1;
      }
      return nid;
    };

    reps.forEach((r, i) => {
      const resId = `res:${r.id}`;
      const animated = i === 0; // highlight the most recent run
      const findings = (r.key_findings ?? []).slice(0, 3);
      const resY = findings.length
        ? (findingIdx + (findings.length - 1) / 2) * 92 + 30
        : i * 110 + 30;

      rfNodes.push({
        id: resId,
        type: "rn",
        position: { x: COL.research, y: resY },
        data: {
          label: truncate(r.title || r.question || "Research", 26),
          type: "research",
          href: `/reports/${r.id}`,
          confidence: r.confidence,
        },
      });

      const linkDoc = (fromId: string, docId: string, name: string, label: string) => {
        const nid = ensureDoc(docId, name);
        rfEdges.push({ id: `${fromId}->${nid}`, source: fromId, target: nid, ...mkEdge(animated, label) });
      };

      if (findings.length === 0) {
        const seen = new Set<string>();
        (r.citations ?? []).forEach((c) => {
          if (seen.has(c.document_id)) return;
          seen.add(c.document_id);
          linkDoc(resId, c.document_id, c.document_name, "cites");
        });
      } else {
        findings.forEach((f) => {
          const fId = `find:${r.id}:${f.id}`;
          rfNodes.push({
            id: fId,
            type: "rn",
            position: { x: COL.finding, y: findingIdx * 92 + 30 },
            data: {
              label: truncate(f.claim, 32),
              type: "finding",
              href: `/reports/${r.id}`,
              confidence: f.confidence,
            },
          });
          rfEdges.push({ id: `${resId}->${fId}`, source: resId, target: fId, ...mkEdge(animated) });
          findingIdx += 1;

          // Link the finding to the documents behind its citations.
          const seen = new Set<string>();
          const cites = (f.citation_ids ?? [])
            .map((cid) => (r.citations ?? []).find((c) => c.id === cid))
            .filter(Boolean) as { document_id: string; document_name: string }[];
          const targets = cites.length ? cites : (r.citations ?? []).slice(0, 2);
          targets.forEach((c) => {
            if (seen.has(c.document_id)) return;
            seen.add(c.document_id);
            linkDoc(fId, c.document_id, c.document_name, "evidence");
          });
        });
      }
    });

    // Empty research → seed with library documents so the canvas isn't blank.
    if (reps.length === 0) {
      (documents ?? []).slice(0, 12).forEach((d) => ensureDoc(d.id, d.name));
    }

    return {
      nodes: rfNodes,
      edges: rfEdges,
      counts: { research: reps.length, finding: findingIdx, document: docIdx },
    };
  }, [reports, documents]);

  const empty = nodes.length === 0;

  return (
    <>
      <Topbar title="Knowledge Graph" subtitle="Research → findings → sources · click a node to open it" />
      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="absolute inset-4 rounded-xl border border-[color:var(--color-border)] bg-[#0a0b0e]/60 overflow-hidden">
          {empty ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Network className="mx-auto h-7 w-7 text-[color:var(--color-fg-muted)]" />
                <p className="mt-2 text-[13px] text-[color:var(--color-fg-dim)]">
                  No research or documents yet in this workspace.
                </p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              minZoom={0.2}
              onNodeClick={(_, node) => {
                const href = (node.data as any)?.href;
                if (href) router.push(href);
              }}
              className="[&_.react-flow__renderer]:!bg-transparent"
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#22252d" />
              <Controls className="!bg-[#0d0e11] !border-[color:var(--color-border)]" />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => TYPE_STYLE[(n.data as any)?.type]?.mini ?? "#6b6f7a"}
                className="!bg-[#0d0e11] !border !border-[color:var(--color-border)] !rounded-md"
              />
            </ReactFlow>
          )}
        </div>

        {/* Legend + live counts */}
        <div className="pointer-events-none absolute right-8 top-8 z-10 rounded-lg border border-[color:var(--color-border)] bg-[#0d0e11]/85 backdrop-blur p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Legend
          </div>
          <ul className="space-y-1 text-[11px]">
            {Object.entries(TYPE_STYLE).map(([k, s]) => (
              <li
                key={k}
                className="flex items-center gap-2 text-[color:var(--color-fg-dim)]"
              >
                <span className={cn("h-2 w-2 rounded-full border", s.border, s.bg)} />
                <span className="flex-1">{s.label}</span>
                <span className="text-white">
                  {counts[k as keyof typeof counts] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
