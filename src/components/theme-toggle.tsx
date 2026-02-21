"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2 rounded-xl bg-bg-input border border-border hover:border-border-hover transition-all duration-200"
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      <Sun className="h-4 w-4 text-t-secondary rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute top-2 left-2 h-4 w-4 text-t-secondary rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
