"use client";

import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const themes = [
  { id: "sunrise", label: "Sunrise", swatch: "#ec6f1d" },
  { id: "ocean", label: "Ocean", swatch: "#0f766e" },
  { id: "forest", label: "Forest", swatch: "#2f6b2d" },
  { id: "graphite", label: "Graphite", swatch: "#374151" },
  { id: "cacumator", label: "Cacumator", swatch: "#552288" },
  { id: "databricks", label: "Databricks", swatch: "#ff3621" },
] as const;

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointer = (event: PointerEvent) => {
      if (!wrapperRef.current) {
        return;
      }
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open]);

  const activeTheme = resolvedTheme ?? "cacumator";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
      >
        <Palette className="h-4 w-4" />
        Theme
      </button>
      <div
        className={`absolute right-0 top-12 z-30 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg transition ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTheme(item.id);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.swatch }} />
              {item.label}
            </span>
            <Check className={`h-4 w-4 ${activeTheme === item.id ? "opacity-100" : "opacity-0"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
