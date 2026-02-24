"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface SheetDetailTab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

interface SheetDetailAction {
  label: string;
  icon: LucideIcon;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: () => void;
}

interface SheetDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: StatusVariant;
  tabs: SheetDetailTab[];
  actions?: SheetDetailAction[];
  headerExtra?: React.ReactNode;
  defaultTab?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export function SheetDetail({
  open,
  onOpenChange,
  title,
  subtitle,
  status,
  statusVariant,
  tabs,
  actions = [],
  headerExtra,
  defaultTab,
}: SheetDetailProps) {
  const resolvedDefault = defaultTab ?? tabs[0]?.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] sm:max-w-[540px] p-0 flex flex-col"
        showCloseButton
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-xl font-bold truncate font-mono tracking-tight">
                {title}
              </SheetTitle>
              {subtitle && (
                <SheetDescription className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </SheetDescription>
              )}
            </div>
            {status && (
              <StatusBadge
                status={status}
                variant={statusVariant}
                className="shrink-0"
              />
            )}
          </div>

          {/* Actions + extra */}
          {(actions.length > 0 || headerExtra) && (
            <div className="flex items-center gap-2 flex-wrap">
              {headerExtra}
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant={action.variant ?? "outline"}
                    size="sm"
                    onClick={action.onClick}
                    className="h-8 text-xs"
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </SheetHeader>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        {resolvedDefault && (
          <Tabs
            defaultValue={resolvedDefault}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-3 border-b shrink-0 overflow-x-auto scrollbar-none">
              <TabsList variant="line" className="inline-flex w-max min-w-full justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="gap-1.5 text-sm px-3"
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-1.5 h-5 min-w-5 text-[10px] font-mono tabular-nums font-semibold",
                          tab.count > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 overflow-y-auto px-6 py-4"
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Detail field helper ─────────────────────────────────────────────────────
interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

export function DetailField({ label, value, mono, className }: DetailFieldProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className={cn("text-sm font-medium", mono && "font-mono tabular-nums")}>
        {value ?? <span className="text-muted-foreground font-normal">—</span>}
      </dd>
    </div>
  );
}

// ── Detail grid helper ──────────────────────────────────────────────────────
export function DetailGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-4",
        cols === 2 ? "grid-cols-2" : "grid-cols-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

// ── Timeline item helper ────────────────────────────────────────────────────
interface TimelineItemProps {
  date: string;
  user?: string;
  description: string;
  icon?: React.ReactNode;
}

export function TimelineItem({ date, user, description, icon }: TimelineItemProps) {
  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
          {icon ?? <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
        </div>
        <div className="flex-1 w-px bg-border mt-1" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm">{description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {user && (
            <span className="text-xs font-medium text-muted-foreground">{user}</span>
          )}
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
      </div>
    </div>
  );
}
