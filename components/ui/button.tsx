import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-contrast)] shadow-[0_10px_22px_color-mix(in_srgb,var(--primary)_20%,transparent)] hover:opacity-95",
  secondary:
    "bg-[color-mix(in_srgb,var(--surface-2)_74%,white)] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-[var(--surface)]",
  ghost: "bg-transparent text-[var(--text)] hover:bg-[var(--surface)]",
  danger: "bg-[var(--danger)] text-white shadow-[0_10px_22px_color-mix(in_srgb,var(--danger)_18%,transparent)] hover:opacity-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:pointer-events-none disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
