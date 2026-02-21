"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-[var(--border-base)]">
      <SidebarHeader className="border-b border-[var(--border-base)] p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-[#7B61FF] to-[#4DA6FF] bg-clip-text text-transparent">
            MotoLibre
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          {navigation.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-t-tertiary font-semibold">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            "rounded-xl transition-all duration-200",
                            isActive && "bg-accent-bg text-accent-DEFAULT border-l-[3px] border-l-accent-DEFAULT"
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn("h-4 w-4", isActive ? "text-accent-DEFAULT" : "text-t-secondary")} />
                            <span className={cn(isActive ? "text-accent-DEFAULT font-medium" : "text-t-secondary")}>
                              {item.title}
                            </span>
                            {item.badge ? (
                              <span className={cn(
                                "ml-auto flex h-5 min-w-5 items-center justify-center",
                                "rounded-full bg-accent-DEFAULT px-1.5 text-xs font-medium text-white"
                              )}>
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--border-base)] p-3">
        <p className="text-center text-xs text-t-tertiary font-medium">
          MotoLibre v3
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
