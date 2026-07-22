import { Topbar } from "@/components/shell/topbar";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard — Researo" };

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Research overview · Krishna's Workspace"
      />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <DashboardView />
      </main>
    </>
  );
}
