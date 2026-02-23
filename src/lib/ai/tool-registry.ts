import type { z } from "zod";
import type { Role } from "@prisma/client";

export type RolUsuario = Role;

export interface ToolDefinition {
  name: string;
  description: string;
  module: string;
  allowedRoles: RolUsuario[];
  parameters: z.ZodObject<z.ZodRawShape>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolsForRole(role: RolUsuario): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) =>
      t.allowedRoles.includes(role)
    );
  }

  getModulesForRole(role: RolUsuario): string[] {
    const modules = new Set<string>();
    this.getToolsForRole(role).forEach((t) => modules.add(t.module));
    return Array.from(modules);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

export const toolRegistry = new ToolRegistry();
