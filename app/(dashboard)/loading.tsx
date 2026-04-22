import { SectionSkeleton } from "@/components/ui/states";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SectionSkeleton rows={2} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={1} />
      </div>
      <SectionSkeleton rows={5} />
    </div>
  );
}
