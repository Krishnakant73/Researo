import { create } from "zustand";

/**
 * Shell sidebar visibility.
 * - desktopOpen: on large screens the sidebar can be collapsed/shown in-flow.
 * - mobileOpen:  on small screens the sidebar is an off-canvas drawer.
 * Not persisted, so it always starts open on desktop / closed on mobile,
 * which keeps SSR and the client render in sync (no hydration mismatch).
 */
interface SidebarState {
  desktopOpen: boolean;
  mobileOpen: boolean;
  toggleDesktop: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  desktopOpen: true,
  mobileOpen: false,
  toggleDesktop: () => set((s) => ({ desktopOpen: !s.desktopOpen })),
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
}));
