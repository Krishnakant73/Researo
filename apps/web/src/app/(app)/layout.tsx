import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full overflow-x-hidden">
      <Sidebar />
      <div className="relative z-10 flex min-h-svh w-full min-w-0 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
