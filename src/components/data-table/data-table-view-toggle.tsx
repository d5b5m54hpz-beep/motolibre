"use client";

import { LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTableView = "list" | "gallery";

interface DataTableViewToggleProps {
  view: DataTableView;
  onViewChange: (view: DataTableView) => void;
}

export function DataTableViewToggle({
  view,
  onViewChange,
}: DataTableViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border bg-background p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          view === "list" && "bg-accent text-accent-foreground"
        )}
        onClick={() => onViewChange("list")}
        aria-label="Vista lista"
      >
        <LayoutList className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          view === "gallery" && "bg-accent text-accent-foreground"
        )}
        onClick={() => onViewChange("gallery")}
        aria-label="Vista galería"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
