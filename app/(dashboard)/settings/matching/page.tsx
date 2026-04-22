"use client";

import { useMemo, useState } from "react";
import { Scale, ShieldAlert, SlidersHorizontal, Target } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { apiFetch } from "@/lib/api-client";
import type { MatchingSettingsResponse } from "@/lib/api-types";
import { hasPermission } from "@/lib/permissions";

function NumberField({ label, value, onChange, helper }: { label: string; value: number; onChange: (value: number) => void; helper: string }) {
  return (
    <label className="grid gap-1 text-sm text-[var(--text)]">
      <span className="font-medium">{label}</span>
      <Input type="number" value={String(value)} onChange={(event) => onChange(Number(event.target.value) || 0)} />
      <span className="text-xs text-[var(--muted)]">{helper}</span>
    </label>
  );
}

function ToggleField({ label, checked, onChange, helper }: { label: string; checked: boolean; onChange: (checked: boolean) => void; helper: string }) {
  return (
    <label className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--text)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p>
        </div>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" />
      </div>
    </label>
  );
}

export default function MatchingSettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState<MatchingSettingsResponse["item"] | null>(null);
  const canManage = hasPermission(user?.role, "matching.policy.manage");

  const settingsQuery = useQuery({
    queryKey: ["matching-settings"],
    queryFn: () => apiFetch<MatchingSettingsResponse>("/api/protected/settings/matching"),
    enabled: canManage,
  });

  const item = draft ?? settingsQuery.data?.item ?? null;
  const totalWeight = useMemo(() => {
    if (!item) return 0;
    return item.interestsWeight + item.contextWeight + item.availabilityWeight + item.formatWeight + item.capacityWeight;
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Matching settings are not ready yet");
      return apiFetch<MatchingSettingsResponse>("/api/protected/settings/matching", {
        method: "PUT",
        body: JSON.stringify(item),
      });
    },
    onSuccess: async (response) => {
      setDraft(response.item);
      await queryClient.invalidateQueries({ queryKey: ["matching-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["matching-candidates"] });
      pushToast({ title: "Matching settings saved", description: "New policies will apply to fresh suggestion runs.", variant: "success" });
    },
    onError: (error) => {
      pushToast({ title: "Could not save matching settings", description: error instanceof Error ? error.message : "Try again.", variant: "error" });
    },
  });

  if (!canManage) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only platform admins can manage matching policy settings." />
      </Card>
    );
  }

  if (settingsQuery.isLoading && !item) return <SectionSkeleton rows={8} />;
  if (settingsQuery.error && !item) {
    return <ErrorState title="Could not load matching settings" description={settingsQuery.error.message || "Try again."} onRetry={() => void settingsQuery.refetch()} />;
  }
  if (!item) return null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Matching Engine</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Matching Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Tune the deterministic matching policy that drives ranked mentor suggestions.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[var(--text)]">Weighting model</p>
              <p className="mt-1 text-sm text-[var(--muted)]">These weights must total 100. The engine uses them before applying penalties.</p>
            </div>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${totalWeight === 100 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              Total {totalWeight}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Interests" value={item.interestsWeight} onChange={(value) => setDraft({ ...item, interestsWeight: value })} helper="Expertise overlap between mentor and mentee." />
            <NumberField label="Context" value={item.contextWeight} onChange={(value) => setDraft({ ...item, contextWeight: value })} helper="School or partner context alignment." />
            <NumberField label="Availability" value={item.availabilityWeight} onChange={(value) => setDraft({ ...item, availabilityWeight: value })} helper="Available mentoring slots and cadence readiness." />
            <NumberField label="Format" value={item.formatWeight} onChange={(value) => setDraft({ ...item, formatWeight: value })} helper="Online, in-person, or hybrid compatibility." />
            <NumberField label="Capacity" value={item.capacityWeight} onChange={(value) => setDraft({ ...item, capacityWeight: value })} helper="Remaining mentor capacity and load health." />
            <NumberField label="Max open mentorships per learner" value={item.maxOpenMentorshipsPerMentee} onChange={(value) => setDraft({ ...item, maxOpenMentorshipsPerMentee: value })} helper="How many pending, active, or paused mentorships a learner may hold at the same time." />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-base font-semibold text-[var(--text)]">Policy summary</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Coordinators see explanation cards based on these controls.</p>
          </div>
          <div className="space-y-3 text-sm text-[var(--text)]">
            <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-2)]/55 p-4">
              <Scale className="mt-0.5 h-5 w-5 text-[var(--primary)]" />
              <div>
                <p className="font-medium">Weighted fit score</p>
                <p className="mt-1 text-xs text-[var(--muted)]">The score is computed first, then adjusted by any enabled risk penalties.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-2)]/55 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium">Risk penalties</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Near-capacity mentors, weak context overlap, low availability, and prior declines can be down-ranked.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-2)]/55 p-4">
              <Target className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">Explainable output</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Coordinators get fit labels, reasons, and cautions instead of a black-box score.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--primary)]" />
            <p className="text-base font-semibold text-[var(--text)]">Penalty rules</p>
          </div>
          <div className="grid gap-4">
            <ToggleField label="Penalize near-capacity mentors" checked={item.penalizeNearCapacity} onChange={(checked) => setDraft({ ...item, penalizeNearCapacity: checked })} helper="Reduce the score when a mentor only has one slot left." />
            <NumberField label="Near-capacity penalty" value={item.nearCapacityPenalty} onChange={(value) => setDraft({ ...item, nearCapacityPenalty: value })} helper="Points deducted when the rule applies." />
            <ToggleField label="Penalize low availability" checked={item.penalizeLowAvailability} onChange={(checked) => setDraft({ ...item, penalizeLowAvailability: checked })} helper="Reduce the score when availability depth is thin." />
            <NumberField label="Low-availability penalty" value={item.lowAvailabilityPenalty} onChange={(value) => setDraft({ ...item, lowAvailabilityPenalty: value })} helper="Points deducted for thin availability overlap." />
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />
            <p className="text-base font-semibold text-[var(--text)]">Learning rules</p>
          </div>
          <div className="grid gap-4">
            <ToggleField label="Penalize weak context overlap" checked={item.penalizeWeakContext} onChange={(checked) => setDraft({ ...item, penalizeWeakContext: checked })} helper="Lower scores when there is no school or partner context match." />
            <NumberField label="Weak-context penalty" value={item.weakContextPenalty} onChange={(value) => setDraft({ ...item, weakContextPenalty: value })} helper="Points deducted for lighter context overlap." />
            <ToggleField label="Penalize prior declines" checked={item.penalizePriorDecline} onChange={(checked) => setDraft({ ...item, penalizePriorDecline: checked })} helper="Down-rank mentor-mentee pairs with a previous proposal decline." />
            <NumberField label="Prior-decline penalty" value={item.priorDeclinePenalty} onChange={(value) => setDraft({ ...item, priorDeclinePenalty: value })} helper="Points deducted when a prior decline exists." />
            <ToggleField label="Exclude prior declined pairs entirely" checked={item.excludePriorDeclinedPair} onChange={(checked) => setDraft({ ...item, excludePriorDeclinedPair: checked })} helper="Remove previously declined mentor-mentee pairs from suggestions instead of only down-ranking them." />
          </div>
        </Card>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void saveMutation.mutateAsync()} disabled={saveMutation.isPending || totalWeight !== 100}>
          {saveMutation.isPending ? "Saving..." : "Save matching settings"}
        </Button>
      </div>
    </div>
  );
}
