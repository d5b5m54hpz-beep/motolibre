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
    <Sidebar collapsible="icon" className="border-r border-gray-800">
      <SidebarHeader className="border-b border-gray-800 p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#23e0ff]">MotoLibre</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          {navigation.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-xs uppercase text-gray-500">
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
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            {item.badge ? (
                              <span className={cn(
                                "ml-auto flex h-5 min-w-5 items-center justify-center",
                                "rounded-full bg-[#23e0ff] px-1.5 text-xs font-medium text-[#0D1B2A]"
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

      <SidebarFooter className="border-t border-gray-800 p-2">
        <p className="text-center text-xs text-gray-600">
          MotoLibre v3
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
