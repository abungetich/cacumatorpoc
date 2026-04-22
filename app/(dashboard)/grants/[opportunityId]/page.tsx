"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import type { GrantOpportunityLotRow, GrantOpportunityRow } from "@/lib/api-types";
import {
  createGrantOpportunityLotRequest,
  deleteGrantOpportunityLotRequest,
  fetchGrantOpportunityDetail,
  updateGrantOpportunityLotRequest,
} from "@/lib/grants-actions";

type LotFormState = {
  description: string;
  quantity: string;
  minBudgetMinor: string;
  maxBudgetMinor: string;
};

const emptyLotForm: LotFormState = {
  description: "",
  quantity: "1",
  minBudgetMinor: "",
  maxBudgetMinor: "",
};

function formatEnum(value: string) {
  return value.replaceAll("_", " ");
}

function formatMinor(value: string, code: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return `${value} ${code}`;
  }
  return `${parsed.toLocaleString()} ${code}`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function opportunityPill(status: GrantOpportunityRow["status"]) {
  if (status === "DISCOVERED") return "bg-slate-100 text-slate-700";
  if (status === "QUALIFYING") return "bg-amber-100 text-amber-800";
  if (status === "PURSUING") return "bg-emerald-100 text-emerald-800";
  return "bg-rose-100 text-rose-800";
}

export default function GrantOpportunityDetailPage() {
  const params = useParams<{ opportunityId: string }>();
  const opportunityId = params.opportunityId;
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [lotForm, setLotForm] = useState<LotFormState>(emptyLotForm);
  const [editingLot, setEditingLot] = useState<GrantOpportunityLotRow | null>(null);
  const [deletingLot, setDeletingLot] = useState<GrantOpportunityLotRow | null>(null);

  const detailQuery = useQuery({
    queryKey: ["grant-opportunity-detail", opportunityId],
    queryFn: () => fetchGrantOpportunityDetail(opportunityId),
    enabled: Boolean(opportunityId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["grant-opportunity-detail", opportunityId] });
    await queryClient.invalidateQueries({ queryKey: ["grants-workspace"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const createLotMutation = useMutation({
    mutationFn: (payload: { description: string; quantity: number; minBudgetMinor: string; maxBudgetMinor: string }) =>
      createGrantOpportunityLotRequest(opportunityId, payload),
    onSuccess: refresh,
  });

  const updateLotMutation = useMutation({
    mutationFn: (payload: {
      lotId: string;
      description: string;
      quantity: number;
      minBudgetMinor: string;
      maxBudgetMinor: string;
    }) =>
      updateGrantOpportunityLotRequest(opportunityId, payload.lotId, {
        description: payload.description,
        quantity: payload.quantity,
        minBudgetMinor: payload.minBudgetMinor,
        maxBudgetMinor: payload.maxBudgetMinor,
      }),
    onSuccess: refresh,
  });

  const deleteLotMutation = useMutation({
    mutationFn: (lotId: string) => deleteGrantOpportunityLotRequest(opportunityId, lotId),
    onSuccess: refresh,
  });

  const opportunity = detailQuery.data?.opportunity ?? null;
  const lots = useMemo(() => detailQuery.data?.lots ?? [], [detailQuery.data?.lots]);

  const totals = useMemo(() => {
    return lots.reduce(
      (acc, lot) => {
        acc.quantity += lot.quantity;
        acc.minBudget += Number(lot.minBudgetMinor);
        acc.maxBudget += Number(lot.maxBudgetMinor);
        return acc;
      },
      {
        quantity: 0,
        minBudget: 0,
        maxBudget: 0,
      },
    );
  }, [lots]);

  const openAddLotModal = () => {
    setEditingLot(null);
    setLotForm(emptyLotForm);
    setIsLotModalOpen(true);
  };

  const openEditLotModal = (lot: GrantOpportunityLotRow) => {
    setEditingLot(lot);
    setLotForm({
      description: lot.description,
      quantity: String(lot.quantity),
      minBudgetMinor: lot.minBudgetMinor,
      maxBudgetMinor: lot.maxBudgetMinor,
    });
    setIsLotModalOpen(true);
  };

  const closeLotModal = () => {
    setIsLotModalOpen(false);
    setEditingLot(null);
    setLotForm(emptyLotForm);
  };

  if (detailQuery.isLoading) {
    return <SectionSkeleton rows={6} />;
  }

  if (detailQuery.error || !opportunity) {
    return (
      <Card>
        <ErrorState
          title="Could not load opportunity"
          description={detailQuery.error?.message || "Try refreshing."}
          onRetry={() => void detailQuery.refetch()}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Link
              href="/grants"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Grants
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Opportunity Detail</p>
            <h1 className="text-2xl font-semibold text-[var(--text)]">{opportunity.title}</h1>
            <p className="text-sm text-[var(--muted)]">{opportunity.funderName}</p>
          </div>
          <Button className="gap-2" onClick={openAddLotModal}>
            <Plus className="h-4 w-4" />
            Add Lot
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            label="Status"
            value={
              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${opportunityPill(opportunity.status)}`}>
                {formatEnum(opportunity.status)}
              </span>
            }
          />
          <InfoTile label="Deadline" value={formatDateTime(opportunity.deadline)} />
          <InfoTile label="Applications" value={String(opportunity.applicationsCount)} />
          <InfoTile label="Total Budget" value={formatMinor(opportunity.amountMinor, opportunity.currencyCode)} />
        </div>

        {opportunity.description ? <p className="mt-4 text-sm text-[var(--muted)]">{opportunity.description}</p> : null}
      </section>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Opportunity Lots</p>
            <p className="text-xs text-[var(--muted)]">
              Lots are optional. Use them when the funder splits scope into multiple packages.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{lots.length} lot(s)</span>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">Qty: {totals.quantity}</span>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              Aggregate: {formatMinor(String(totals.minBudget), opportunity.currencyCode)} - {formatMinor(String(totals.maxBudget), opportunity.currencyCode)}
            </span>
          </div>
        </div>

        {lots.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              title="No lots yet"
              description="This opportunity can remain as a single budget item. Add lots only if needed by the grant structure."
            />
            <div className="flex justify-center">
              <Button className="gap-2" onClick={openAddLotModal}>
                <Plus className="h-4 w-4" />
                Add First Lot
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="max-h-[50vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Lot</th>
                    <th className="px-3 py-3 font-semibold">Qty</th>
                    <th className="px-3 py-3 font-semibold">Min Budget</th>
                    <th className="px-3 py-3 font-semibold">Max Budget</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, index) => (
                    <tr key={lot.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[var(--text)]">Lot {index + 1}</p>
                        <p className="max-w-[52ch] text-xs text-[var(--muted)]">{lot.description}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">{lot.quantity}</td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        {formatMinor(lot.minBudgetMinor, opportunity.currencyCode)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">
                        {formatMinor(lot.maxBudgetMinor, opportunity.currencyCode)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatDateTime(lot.updatedAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditLotModal(lot)}
                            title="Edit lot"
                            aria-label="Edit lot"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeletingLot(lot)}
                            title="Delete lot"
                            aria-label="Delete lot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={isLotModalOpen}
        onClose={closeLotModal}
        title={editingLot ? "Edit Lot" : "Add Lot"}
        description="Define a package with quantity and budget band."
        icon={<Boxes className="h-4 w-4" />}
        size="lg"
      >
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            const payload = {
              description: lotForm.description.trim(),
              quantity: Number(lotForm.quantity),
              minBudgetMinor: lotForm.minBudgetMinor.trim(),
              maxBudgetMinor: lotForm.maxBudgetMinor.trim(),
            };

            try {
              if (editingLot) {
                await updateLotMutation.mutateAsync({
                  lotId: editingLot.id,
                  ...payload,
                });
                pushToast({
                  title: "Lot Updated",
                  description: "Opportunity lot updated successfully.",
                  variant: "success",
                });
              } else {
                await createLotMutation.mutateAsync(payload);
                pushToast({
                  title: "Lot Added",
                  description: "Opportunity lot saved.",
                  variant: "success",
                });
              }
              closeLotModal();
            } catch (error) {
              pushToast({
                title: editingLot ? "Could not update lot" : "Could not add lot",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "error",
              });
            }
          }}
        >
          <div className="md:col-span-2">
            <LabeledField label="Description" required>
              <textarea
                className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Describe what this lot covers"
                required
                value={lotForm.description}
                onChange={(event) => setLotForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </LabeledField>
          </div>

          <LabeledField label="Quantity" required>
            <Input
              required
              type="number"
              min={1}
              value={lotForm.quantity}
              onChange={(event) => setLotForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Currency" required>
            <Input value={opportunity.currencyCode} readOnly />
          </LabeledField>

          <LabeledField label="Min Budget (Minor Units)" required>
            <Input
              required
              inputMode="numeric"
              value={lotForm.minBudgetMinor}
              onChange={(event) => setLotForm((prev) => ({ ...prev, minBudgetMinor: event.target.value }))}
            />
          </LabeledField>

          <LabeledField label="Max Budget (Minor Units)" required>
            <Input
              required
              inputMode="numeric"
              value={lotForm.maxBudgetMinor}
              onChange={(event) => setLotForm((prev) => ({ ...prev, maxBudgetMinor: event.target.value }))}
            />
          </LabeledField>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" onClick={closeLotModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLotMutation.isPending || updateLotMutation.isPending}>
              {createLotMutation.isPending || updateLotMutation.isPending
                ? "Saving..."
                : editingLot
                  ? "Update Lot"
                  : "Save Lot"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingLot)}
        onClose={() => setDeletingLot(null)}
        title="Delete Lot"
        description="This action cannot be undone."
        icon={<Target className="h-4 w-4" />}
        size="md"
      >
        {deletingLot ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">Delete this lot from the opportunity?</p>
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text)]">
              {deletingLot.description}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingLot(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await deleteLotMutation.mutateAsync(deletingLot.id);
                    pushToast({
                      title: "Lot Deleted",
                      description: "Opportunity lot removed.",
                      variant: "success",
                    });
                    setDeletingLot(null);
                  } catch (error) {
                    pushToast({
                      title: "Could not delete lot",
                      description: error instanceof Error ? error.message : "Request failed.",
                      variant: "error",
                    });
                  }
                }}
                disabled={deleteLotMutation.isPending}
              >
                {deleteLotMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function LabeledField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-[var(--text)]">
      <span>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}
