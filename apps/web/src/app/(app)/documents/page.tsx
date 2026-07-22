import { Suspense } from "react";
import { Topbar } from "@/components/shell/topbar";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata = { title: "Documents — Researo" };

export default function DocumentsPage() {
  return (
    <>
      <Topbar title="Documents" subtitle="Your indexed knowledge library" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Suspense>
          <DocumentsView />
        </Suspense>
      </main>
    </>
  );
}
