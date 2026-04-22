"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_58%,white)] px-3 py-2 text-sm text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_1px_4px_rgba(51,42,74,0.04)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--primary)_18%,transparent)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
