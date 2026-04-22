import { Card } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string;
  delta: string;
};

export function StatCard({ title, value, delta }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{value}</p>
      <p className="mt-2 text-xs text-[var(--primary)]">{delta}</p>
    </Card>
  );
}
