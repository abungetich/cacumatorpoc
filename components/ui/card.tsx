import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_14px_38px_rgba(27,21,45,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
