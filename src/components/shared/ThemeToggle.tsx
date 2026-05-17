"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): Theme {
  return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

function subscribeToThemeChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("themechange", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("themechange", callback);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getStoredTheme, getServerTheme);

  function updateTheme(nextTheme: Theme) {
    window.localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("themechange"));
  }

  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      aria-label={`Cambiar a modo ${nextTheme === "dark" ? "oscuro" : "claro"}`}
      onClick={() => {
        updateTheme(nextTheme);
      }}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
