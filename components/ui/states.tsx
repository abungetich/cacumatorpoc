import { Button } from "@/components/ui/button";

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`skeleton-${index + 1}`}
          className="h-10 animate-pulse rounded-xl bg-[color-mix(in_oklab,var(--muted)_22%,transparent)]"
        />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--danger)]/20 bg-[color-mix(in_oklab,var(--danger)_8%,var(--surface))] p-4">
      <h3 className="text-sm font-semibold text-[var(--danger)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      {onRetry ? (
        <Button className="mt-3" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
