import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_58%,white)] px-3 text-sm text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_1px_4px_rgba(51,42,74,0.04)]",
        "placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
