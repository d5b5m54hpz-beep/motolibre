import type { CSSProperties } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "260px",
          "--sidebar-width-icon": "68px",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </SidebarInset>
      <MobileTabBar />
    </SidebarProvider>
  );
}
