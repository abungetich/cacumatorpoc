import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type PlatformLogoProps = {
  logoUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 rounded-xl",
  md: "h-11 w-11 rounded-2xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;

const iconClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

export function PlatformLogo({ logoUrl, name, size = "md", className }: PlatformLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_62%,white))] text-[var(--primary-contrast)] shadow-[0_18px_36px_rgba(0,0,0,0.12)]",
        sizeClasses[size],
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" />
      ) : (
        <Shield className={iconClasses[size]} />
      )}
    </div>
  );
}
