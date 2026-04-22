"use client";

import { FormEvent, useMemo, useState } from "react";
import Swal from "sweetalert2";
import type { SortingState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useToast } from "@/context/toast-context";
import type {
  GrantCurrencySettingRow,
  GrantFunderRow,
  GrantFunderType,
  GrantSourceSettingRow,
} from "@/lib/api-types";
import {
  createGrantCurrencySetting,
  createGrantFunder,
  createGrantSourceSetting,
  fetchGrantSettingsWorkspace,
  updateGrantCurrencySetting,
  updateGrantFunder,
  updateGrantScoringProfile,
  updateGrantSourceSetting,
} from "@/lib/grant-settings-actions";
import {
  defaultScoringForm,
  emptyCurrencyForm,
  emptyFunderForm,
  emptySourceForm,
  toCurrencyForm,
  toFunderForm,
  toSourceForm,
  type ActiveGrantSettingsTab,
  type CurrencyFormState,
  type FunderFormState,
  type ScoringFormState,
  type SourceFormState,
} from "@/lib/grant-settings-workspace";
import {
  CurrenciesTab,
  FundersTab,
  GrantSettingsHeader,
  GrantSettingsTabBar,
  ScoringTab,
  SourcesTab,
} from "@/components/grants/settings/grant-settings-tabs";
import { GrantSettingsModals } from "@/components/grants/settings/grant-settings-modals";

export default function GrantSettingsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveGrantSettingsTab>("funders");
  const [funderSearch, setFunderSearch] = useState("");
  const [funderTypeFilter, setFunderTypeFilter] = useState<GrantFunderType | "ALL">("ALL");
  const [funderStatusFilter, setFunderStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [funderSorting, setFunderSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const [showFunderModal, setShowFunderModal] = useState(false);
  const [editingFunder, setEditingFunder] = useState<GrantFunderRow | null>(null);
  const [viewingFunder, setViewingFunder] = useState<GrantFunderRow | null>(null);
  const [funderForm, setFunderForm] = useState<FunderFormState>(emptyFunderForm);

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<GrantSourceSettingRow | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(emptySourceForm);

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<GrantCurrencySettingRow | null>(null);
  const [currencyForm, setCurrencyForm] = useState<CurrencyFormState>(emptyCurrencyForm);

  const workspaceQuery = useQuery({
    queryKey: ["grant-settings-workspace"],
    queryFn: fetchGrantSettingsWorkspace,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["grant-settings-workspace"] });
    await queryClient.invalidateQueries({ queryKey: ["grants-workspace"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const createFunderMutation = useMutation({ mutationFn: createGrantFunder, onSuccess: refresh });
  const updateFunderMutation = useMutation({
    mutationFn: ({ funderId, payload }: { funderId: string; payload: Parameters<typeof updateGrantFunder>[1] }) => updateGrantFunder(funderId, payload),
    onSuccess: refresh,
  });
  const createSourceMutation = useMutation({ mutationFn: createGrantSourceSetting, onSuccess: refresh });
  const updateSourceMutation = useMutation({
    mutationFn: ({ sourceId, payload }: { sourceId: string; payload: Parameters<typeof updateGrantSourceSetting>[1] }) => updateGrantSourceSetting(sourceId, payload),
    onSuccess: refresh,
  });
  const createCurrencyMutation = useMutation({ mutationFn: createGrantCurrencySetting, onSuccess: refresh });
  const updateCurrencyMutation = useMutation({
    mutationFn: ({ currencyId, payload }: { currencyId: string; payload: Parameters<typeof updateGrantCurrencySetting>[1] }) => updateGrantCurrencySetting(currencyId, payload),
    onSuccess: refresh,
  });
  const updateScoringMutation = useMutation({ mutationFn: updateGrantScoringProfile, onSuccess: refresh });

  const funders = workspaceQuery.data?.funders ?? [];
  const sources = useMemo(() => [...(workspaceQuery.data?.sourceSettings ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [workspaceQuery.data?.sourceSettings]);
  const currencies = useMemo(() => [...(workspaceQuery.data?.currencySettings ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sortOrder - b.sortOrder), [workspaceQuery.data?.currencySettings]);
  const canEdit = workspaceQuery.data?.canEdit ?? false;

  const scoringState = useMemo<ScoringFormState>(() => {
    const profile = workspaceQuery.data?.scoringProfile;
    if (!profile) return defaultScoringForm();
    return {
      timelineWeight: profile.timelineWeight,
      amountWeight: profile.amountWeight,
      areaWeight: profile.areaWeight,
      eligibilityWeight: profile.eligibilityWeight,
      readinessWeight: profile.readinessWeight,
    };
  }, [workspaceQuery.data?.scoringProfile]);

  const [scoringDraft, setScoringDraft] = useState<ScoringFormState | null>(null);
  const scoringForm = scoringDraft ?? scoringState;

  const onFunderSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const focusAreas = funderForm.focusAreas.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
    const payload = {
      name: funderForm.name.trim(),
      type: funderForm.type,
      website: funderForm.website.trim() || undefined,
      country: funderForm.country.trim() || undefined,
      hqCity: funderForm.hqCity.trim() || undefined,
      focusAreas,
      typicalMinAmountMinor: funderForm.typicalMinAmountMinor.trim() || undefined,
      typicalMaxAmountMinor: funderForm.typicalMaxAmountMinor.trim() || undefined,
      currencyCode: funderForm.currencyCode.trim().toUpperCase() || undefined,
      applicationUrl: funderForm.applicationUrl.trim() || undefined,
      isActive: funderForm.isActive,
      contact: funderForm.contactName.trim() ? { name: funderForm.contactName.trim(), email: funderForm.contactEmail.trim() || undefined, phone: funderForm.contactPhone.trim() || undefined, role: funderForm.contactRole.trim() || undefined, isPrimary: true } : undefined,
    } as const;
    try {
      if (editingFunder) {
        await updateFunderMutation.mutateAsync({ funderId: editingFunder.id, payload });
        pushToast({ title: "Funder Updated", description: `${payload.name} changes saved.`, variant: "success" });
      } else {
        await createFunderMutation.mutateAsync(payload);
        pushToast({ title: "Funder Added", description: `${payload.name} is now available in the directory.`, variant: "success" });
      }
      setShowFunderModal(false);
      setEditingFunder(null);
      setFunderForm(emptyFunderForm);
    } catch (error) {
      pushToast({ title: "Save Failed", description: error instanceof Error ? error.message : "Could not save funder.", variant: "error" });
    }
  };

  const onSourceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = { code: sourceForm.code.trim().toUpperCase(), label: sourceForm.label.trim(), description: sourceForm.description.trim() || undefined, sortOrder: Number(sourceForm.sortOrder), isActive: sourceForm.isActive };
      if (editingSource) {
        await updateSourceMutation.mutateAsync({ sourceId: editingSource.id, payload });
        pushToast({ title: "Source Updated", description: `${sourceForm.label} changes saved.`, variant: "success" });
      } else {
        await createSourceMutation.mutateAsync(payload);
        pushToast({ title: "Source Added", description: `${sourceForm.label} is now available.`, variant: "success" });
      }
      setShowSourceModal(false);
      setEditingSource(null);
      setSourceForm(emptySourceForm);
    } catch (error) {
      pushToast({ title: "Save Failed", description: error instanceof Error ? error.message : "Could not save source setting.", variant: "error" });
    }
  };

  const onCurrencySubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = { code: currencyForm.code.trim().toUpperCase(), label: currencyForm.label.trim(), symbol: currencyForm.symbol.trim() || undefined, minorUnit: Number(currencyForm.minorUnit), sortOrder: Number(currencyForm.sortOrder), isDefault: currencyForm.isDefault, isActive: currencyForm.isActive };
      if (editingCurrency) {
        await updateCurrencyMutation.mutateAsync({ currencyId: editingCurrency.id, payload });
        pushToast({ title: "Currency Updated", description: `${currencyForm.code} settings updated.`, variant: "success" });
      } else {
        await createCurrencyMutation.mutateAsync(payload);
        pushToast({ title: "Currency Added", description: `${currencyForm.code} is now available.`, variant: "success" });
      }
      setShowCurrencyModal(false);
      setEditingCurrency(null);
      setCurrencyForm(emptyCurrencyForm);
    } catch (error) {
      pushToast({ title: "Save Failed", description: error instanceof Error ? error.message : "Could not save currency.", variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <GrantSettingsHeader />
      <GrantSettingsTabBar activeTab={activeTab} onChange={setActiveTab} />

      {workspaceQuery.isLoading ? <SectionSkeleton rows={10} /> : null}
      {workspaceQuery.error ? <ErrorState title="Could not load grant settings" description={workspaceQuery.error.message || "Try refreshing."} onRetry={() => void workspaceQuery.refetch()} /> : null}
      {!workspaceQuery.isLoading && !workspaceQuery.error && funders.length === 0 && sources.length === 0 && currencies.length === 0 ? (
        <EmptyState title="No grant settings yet" description="Start by creating funders, channels, or currencies." />
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.error ? (
        <>
          {activeTab === "funders" ? (
            <FundersTab
              funders={funders}
              canEdit={canEdit}
              search={funderSearch}
              onSearchChange={setFunderSearch}
              typeFilter={funderTypeFilter}
              onTypeFilterChange={setFunderTypeFilter}
              statusFilter={funderStatusFilter}
              onStatusFilterChange={setFunderStatusFilter}
              sorting={funderSorting}
              onSortingChange={setFunderSorting}
              onOpenCreate={() => { setEditingFunder(null); setFunderForm(emptyFunderForm); setShowFunderModal(true); }}
              onView={setViewingFunder}
              onEdit={(row) => { setEditingFunder(row); setFunderForm(toFunderForm(row)); setShowFunderModal(true); }}
              onToggle={async (row) => {
                const prompt = await Swal.fire({ title: row.isActive ? "Deactivate this funder?" : "Activate this funder?", text: row.isActive ? "This will hide it from active selection lists." : "This will make the funder available for use.", icon: "warning", showCancelButton: true, confirmButtonText: row.isActive ? "Deactivate" : "Activate" });
                if (!prompt.isConfirmed) return;
                try {
                  await updateFunderMutation.mutateAsync({ funderId: row.id, payload: { isActive: !row.isActive } });
                  pushToast({ title: row.isActive ? "Funder Deactivated" : "Funder Activated", description: row.name, variant: "success" });
                } catch (error) {
                  pushToast({ title: "Update Failed", description: error instanceof Error ? error.message : "Could not update funder status.", variant: "error" });
                }
              }}
            />
          ) : null}
          {activeTab === "sources" ? (
            <SourcesTab
              rows={sources}
              canEdit={canEdit}
              onOpenCreate={() => { setEditingSource(null); setSourceForm(emptySourceForm); setShowSourceModal(true); }}
              onEdit={(row) => { setEditingSource(row); setSourceForm(toSourceForm(row)); setShowSourceModal(true); }}
              onToggle={async (row) => {
                try {
                  await updateSourceMutation.mutateAsync({ sourceId: row.id, payload: { isActive: !row.isActive } });
                  pushToast({ title: "Source Updated", description: `${row.label} is now ${row.isActive ? "inactive" : "active"}.`, variant: "success" });
                } catch (error) {
                  pushToast({ title: "Update Failed", description: error instanceof Error ? error.message : "Could not update source.", variant: "error" });
                }
              }}
            />
          ) : null}
          {activeTab === "currencies" ? (
            <CurrenciesTab
              rows={currencies}
              canEdit={canEdit}
              onOpenCreate={() => { setEditingCurrency(null); setCurrencyForm(emptyCurrencyForm); setShowCurrencyModal(true); }}
              onEdit={(row) => { setEditingCurrency(row); setCurrencyForm(toCurrencyForm(row)); setShowCurrencyModal(true); }}
              onSetDefault={async (row) => {
                if (row.isDefault) return;
                try {
                  await updateCurrencyMutation.mutateAsync({ currencyId: row.id, payload: { isDefault: true } });
                  pushToast({ title: "Default Currency Updated", description: `${row.code} is now the default.`, variant: "success" });
                } catch (error) {
                  pushToast({ title: "Update Failed", description: error instanceof Error ? error.message : "Could not update currency.", variant: "error" });
                }
              }}
              onToggle={async (row) => {
                try {
                  await updateCurrencyMutation.mutateAsync({ currencyId: row.id, payload: { isActive: !row.isActive } });
                  pushToast({ title: "Currency Updated", description: `${row.code} is now ${row.isActive ? "inactive" : "active"}.`, variant: "success" });
                } catch (error) {
                  pushToast({ title: "Update Failed", description: error instanceof Error ? error.message : "Could not update currency.", variant: "error" });
                }
              }}
            />
          ) : null}
          {activeTab === "scoring" ? <ScoringTab scoringForm={scoringForm} scoringState={scoringState} canEdit={canEdit} pending={updateScoringMutation.isPending} onChange={setScoringDraft} onSave={async () => {
            try {
              await updateScoringMutation.mutateAsync(scoringForm);
              setScoringDraft(null);
              pushToast({ title: "Scoring Updated", description: "Grant fit scoring weights have been updated.", variant: "success" });
            } catch (error) {
              pushToast({ title: "Save Failed", description: error instanceof Error ? error.message : "Could not update scoring profile.", variant: "error" });
            }
          }} /> : null}
        </>
      ) : null}

      <GrantSettingsModals
        showFunderModal={showFunderModal}
        editingFunder={editingFunder}
        funderForm={funderForm}
        showSourceModal={showSourceModal}
        editingSource={editingSource}
        sourceForm={sourceForm}
        showCurrencyModal={showCurrencyModal}
        editingCurrency={editingCurrency}
        currencyForm={currencyForm}
        viewingFunder={viewingFunder}
        pending={{ funder: createFunderMutation.isPending || updateFunderMutation.isPending, source: createSourceMutation.isPending || updateSourceMutation.isPending, currency: createCurrencyMutation.isPending || updateCurrencyMutation.isPending }}
        onCloseFunder={() => { setShowFunderModal(false); setEditingFunder(null); }}
        onCloseSource={() => { setShowSourceModal(false); setEditingSource(null); }}
        onCloseCurrency={() => { setShowCurrencyModal(false); setEditingCurrency(null); }}
        onCloseViewing={() => setViewingFunder(null)}
        onFunderFormChange={setFunderForm}
        onSourceFormChange={setSourceForm}
        onCurrencyFormChange={setCurrencyForm}
        onFunderSubmit={onFunderSubmit}
        onSourceSubmit={onSourceSubmit}
        onCurrencySubmit={onCurrencySubmit}
      />
    </div>
  );
}
