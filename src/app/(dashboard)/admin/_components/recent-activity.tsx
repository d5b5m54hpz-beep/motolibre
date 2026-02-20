"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { Activity } from "lucide-react";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin actividad todavía</p>
              <p className="text-xs mt-1">Los eventos se registran automáticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{event.operationId}</p>
                <p className="text-xs text-muted-foreground">
                  {event.entityType} · {event.entityId.slice(0, 8)}...
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={
                    event.status === "COMPLETED"
                      ? "border-green-500/20 text-green-500"
                      : "border-red-500/20 text-red-500"
                  }
                >
                  {event.status}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
