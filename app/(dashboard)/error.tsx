"use client";

import { ErrorState } from "@/components/ui/states";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Dashboard failed to load"
      description={error.message || "An unexpected error occurred."}
      onRetry={reset}
    />
  );
}
