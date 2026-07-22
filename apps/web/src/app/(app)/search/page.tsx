import { Suspense } from "react";
import { Topbar } from "@/components/shell/topbar";
import { SearchView } from "@/components/search/search-view";

export const metadata = { title: "Search — Researo" };

export default function SearchPage() {
  return (
    <>
      <Topbar title="Search" subtitle="Semantic + lexical search across your evidence" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Suspense>
          <SearchView />
        </Suspense>
      </main>
    </>
  );
}
