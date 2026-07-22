import { Suspense } from "react";
import { Topbar } from "@/components/shell/topbar";
import { ResearchWorkspace } from "@/components/research/research-workspace";

export const metadata = { title: "Research — Researo" };

export default function ResearchPage() {
  return (
    <>
      <Topbar title="Research" subtitle="Ask a question grounded in your library" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Suspense>
          <ResearchWorkspace />
        </Suspense>
      </main>
    </>
  );
}
