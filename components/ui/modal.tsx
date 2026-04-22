"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl" | "2xl";
  icon?: React.ReactNode;
};

const sizeClassMap: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export function Modal({ open, title, description, onClose, children, size = "lg", icon }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl",
          sizeClassMap[size],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[var(--primary)]/15 via-[var(--surface-2)] to-[var(--primary)]/10 px-5 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {icon ? (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
                  {icon}
                </span>
              ) : null}
              <div>
                <h2 className="text-xl font-semibold leading-tight tracking-tight [font-kerning:normal] text-[var(--text)]">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed [font-kerning:normal] text-[var(--muted)]">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
