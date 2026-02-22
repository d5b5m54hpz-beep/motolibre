"use client";

import { formatDateTime } from "@/lib/format";
import { Activity } from "lucide-react";
import { DSBadge } from "@/components/ui/ds-badge";

interface Event {
  id: string;
  operationId: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
}

interface RecentActivityProps {
  events: Event[];
}

export function RecentActivity({ events }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
          Actividad Reciente
        </h3>
        <div className="text-center py-16">
          <Activity className="h-12 w-12 text-t-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-t-primary mb-1">Sin actividad</h3>
          <p className="text-sm text-t-secondary">Los eventos se registran automaticamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
        Actividad Reciente
      </h3>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-border p-3 text-sm hover:bg-bg-card-hover transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-t-primary truncate">{event.operationId}</p>
              <p className="text-xs text-t-secondary">
                {event.entityType} · {event.entityId.slice(0, 8)}...
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <DSBadge variant={event.status === "COMPLETED" ? "positive" : "negative"}>
                {event.status}
              </DSBadge>
              <span className="text-xs text-t-tertiary whitespace-nowrap">
                {formatDateTime(event.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
