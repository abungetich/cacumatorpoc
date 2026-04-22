'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrganizationType } from '@prisma/client';
import { ArrowRight, Building2, FileSignature, MailCheck, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState, SectionSkeleton } from '@/components/ui/states';
import { RenderedRichText } from '@/components/ui/rendered-rich-text';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';
import { assentOrganizationAgreement, fetchOrganizationOnboardingWorkspace, updateOrganizationOnboardingProfile, uploadOrganizationLogo } from '@/lib/organization-actions';

export default function OrganizationOnboardingPage() {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const readerRef = useRef<HTMLDivElement | null>(null);

  const workspaceQuery = useQuery({
    queryKey: ['organization-onboarding-workspace'],
    queryFn: fetchOrganizationOnboardingWorkspace,
  });

  const item = workspaceQuery.data?.item;
  const [form, setForm] = useState({
    organizationName: '',
    type: 'CORPORATE' as OrganizationType,
    logoUrl: '',
    registrationNumber: '',
    website: '',
    description: '',
    mission: '',
    country: 'Kenya',
    county: '',
    city: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    primaryContactName: '',
    primaryContactTitle: '',
    adminTitle: '',
    mentorParticipation: true,
    financialSupport: false,
    inKindSupport: false,
    schoolsOfInterest: '',
  });
  const [agreementCode, setAgreementCode] = useState<string | null>(null);
  const [acknowledgedName, setAcknowledgedName] = useState(user?.name ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [readerReachedEnd, setReaderReachedEnd] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      organizationName: item.organization.name,
      type: item.organization.type,
      logoUrl: item.organization.logoUrl ?? '',
      registrationNumber: item.organization.registrationNumber ?? '',
      website: item.organization.website ?? '',
      description: item.organization.description ?? '',
      mission: item.organization.mission ?? '',
      country: item.organization.country,
      county: item.organization.county ?? '',
      city: item.organization.city ?? '',
      address: item.organization.address ?? '',
      contactEmail: item.organization.contactEmail,
      contactPhone: item.organization.contactPhone ?? '',
      primaryContactName: item.organization.primaryContactName,
      primaryContactTitle: item.organization.primaryContactTitle ?? '',
      adminTitle: item.organization.adminTitle ?? '',
      mentorParticipation: item.organization.mentorParticipation,
      financialSupport: item.organization.financialSupport,
      inKindSupport: item.organization.inKindSupport,
      schoolsOfInterest: item.organization.schoolsOfInterest.join(', '),
    });
  }, [item]);

  const currentAgreement = useMemo(
    () => item?.agreements.find((entry) => entry.code === agreementCode) ?? null,
    [agreementCode, item?.agreements],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateOrganizationOnboardingProfile({
        ...form,
        logoUrl: form.logoUrl.trim() || null,
        schoolsOfInterest: form.schoolsOfInterest.split(',').map((value) => value.trim()).filter(Boolean),
      }),
    onSuccess: async (data) => {
      await queryClient.setQueryData(['organization-onboarding-workspace'], data);
      pushToast({ title: 'Organization profile saved', description: 'Continue with the remaining agreement steps.', variant: 'success' });
    },
    onError: (error) => {
      pushToast({ title: 'Could not save organization profile', description: error instanceof Error ? error.message : 'Try again.', variant: 'error' });
    },
  });

  const assentMutation = useMutation({
    mutationFn: () => {
      if (!currentAgreement) {
        throw new Error('Select an agreement first');
      }
      return assentOrganizationAgreement({
        code: currentAgreement.code,
        acknowledgedName: acknowledgedName.trim(),
        confirmed: true,
        reachedEnd: true,
      });
    },
    onSuccess: async (data) => {
      await queryClient.setQueryData(['organization-onboarding-workspace'], data);
      pushToast({ title: 'Agreement recorded', description: 'This agreement is now on file for the organization.', variant: 'success' });
      setAgreementCode(null);
      setConfirmed(false);
      setReaderReachedEnd(false);
    },
    onError: (error) => {
      pushToast({ title: 'Could not record agreement', description: error instanceof Error ? error.message : 'Try again.', variant: 'error' });
    },
  });

  const handleLogoSelected = async (file: File | null) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const payload = await uploadOrganizationLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: payload.logoUrl ?? '' }));
      pushToast({ title: 'Logo uploaded', description: 'Save the organization profile to keep this logo.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Could not upload logo', description: error instanceof Error ? error.message : 'Try again.', variant: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleReaderScroll = () => {
    const node = readerRef.current;
    if (!node) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 8) {
      setReaderReachedEnd(true);
    }
  };

  const canSubmitAgreement = Boolean(currentAgreement && acknowledgedName.trim().length >= 3 && confirmed && readerReachedEnd);

  if (workspaceQuery.isLoading) {
    return <SectionSkeleton rows={8} />;
  }

  if (workspaceQuery.error) {
    return <ErrorState title="Could not load organization onboarding" description={workspaceQuery.error.message || 'Try again.'} onRetry={() => void workspaceQuery.refetch()} />;
  }

  if (!item) {
    return <ErrorState title="Organization onboarding is unavailable" description="No organization-admin workspace was found for this account." />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Organization Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Complete the organization admin setup before review.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Keep the public registration short. Verify the admin email first, then finish the organization profile and agreements here.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <ChecklistCard icon={MailCheck} label="Email verified" done={Boolean(item.admin.emailVerifiedAt)} detail={item.admin.emailVerifiedAt ? 'Verified' : 'Pending'} />
          <ChecklistCard icon={UserRound} label="Account details" done={item.accountComplete} detail={item.accountComplete ? 'Complete' : 'Finish account profile'} />
          <ChecklistCard icon={Building2} label="Organization profile" done={item.organizationProfileComplete} detail={item.organizationProfileComplete ? 'Complete' : 'Complete organization details'} />
          <ChecklistCard icon={FileSignature} label="Required agreements" done={item.completedAgreementCount === item.requiredAgreementCount} detail={`${item.completedAgreementCount}/${item.requiredAgreementCount} complete`} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Organization Profile</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Finish the operating profile</h2>
            </div>
            <Link href="/profile" className="text-sm font-medium text-[var(--primary)]">Open account</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Organization Name" required><Input value={form.organizationName} onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))} /></Field>
            <Field label="Contact Email" required><Input type="email" value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} /></Field>
            <Field label="Contact Phone"><Input value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} /></Field>
            <Field label="Primary Contact Name" required><Input value={form.primaryContactName} onChange={(event) => setForm((prev) => ({ ...prev, primaryContactName: event.target.value }))} /></Field>
            <Field label="Primary Contact Title"><Input value={form.primaryContactTitle} onChange={(event) => setForm((prev) => ({ ...prev, primaryContactTitle: event.target.value }))} /></Field>
            <Field label="Admin Title"><Input value={form.adminTitle} onChange={(event) => setForm((prev) => ({ ...prev, adminTitle: event.target.value }))} /></Field>
            <Field label="Country" required><Input value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} /></Field>
            <Field label="County / State"><Input value={form.county} onChange={(event) => setForm((prev) => ({ ...prev, county: event.target.value }))} /></Field>
            <Field label="City"><Input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} /></Field>
            <Field label="Website"><Input value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} /></Field>
            <WideField label="Address"><Textarea rows={3} value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} /></WideField>
            <WideField label="Mission"><Textarea rows={3} value={form.mission} onChange={(event) => setForm((prev) => ({ ...prev, mission: event.target.value }))} /></WideField>
            <WideField label="Description"><Textarea rows={4} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></WideField>
            <WideField label="Schools of Interest"><Input value={form.schoolsOfInterest} onChange={(event) => setForm((prev) => ({ ...prev, schoolsOfInterest: event.target.value }))} placeholder="Comma-separated school names" /></WideField>
            <WideField label="Participation Model">
              <div className="grid gap-3 sm:grid-cols-3">
                <ModeCard label="Provide mentors" active={form.mentorParticipation} onClick={() => setForm((prev) => ({ ...prev, mentorParticipation: !prev.mentorParticipation }))} />
                <ModeCard label="Financial support" active={form.financialSupport} onClick={() => setForm((prev) => ({ ...prev, financialSupport: !prev.financialSupport }))} />
                <ModeCard label="In-kind support" active={form.inKindSupport} onClick={() => setForm((prev) => ({ ...prev, inKindSupport: !prev.inKindSupport }))} />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">These participation options can be updated later. They do not change your system access role.</p>
            </WideField>
            <WideField label="Organization Logo">
              <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="Organization logo" className="h-full w-full object-cover" />
                  ) : <Building2 className="h-6 w-6 text-[var(--muted)]" />}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)]">
                  {isUploadingLogo ? 'Uploading...' : form.logoUrl ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={isUploadingLogo} onChange={(event) => { const file = event.target.files?.[0] ?? null; void handleLogoSelected(file); event.currentTarget.value = ''; }} />
                </label>
              </div>
            </WideField>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isUploadingLogo}>{saveMutation.isPending ? 'Saving...' : 'Save organization profile'}</Button>
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_65%,white))] text-[var(--primary-contrast)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Agreements</p>
              <h2 className="text-xl font-semibold text-[var(--text)]">Read and assent to required documents</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {item.agreements.map((agreement) => (
              <button key={agreement.code} type="button" onClick={() => { setAgreementCode(agreement.code); setAcknowledgedName(user?.name ?? item.admin.name); setConfirmed(false); setReaderReachedEnd(false); }} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,white)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{agreement.title}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{agreement.version}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{agreement.summary}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agreement.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                    {agreement.completed ? 'Assented' : 'Pending'}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--muted)]">
            <p>Required agreements are completed by the organization admin after email verification and sign-in.</p>
            <p>Only after the account, organization profile, and required agreements are complete does the organization move into review.</p>
          </div>
        </Card>
      </section>

      {currentAgreement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <Card className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-0">
            <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,white),var(--surface))] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Organization Agreement</p>
              <h3 className="mt-1 text-2xl font-semibold text-[var(--text)]">{currentAgreement.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Scroll to the end before confirming. This document is addressed to {item.organization.name} and the current admin signer.</p>
            </div>
            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="min-h-0 border-r border-[var(--border)] p-5">
                <div ref={readerRef} onScroll={handleReaderScroll} className="max-h-[56vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                  <RenderedRichText
                    html={currentAgreement.documentBody}
                    variables={{
                      '{{admin_name}}': acknowledgedName.trim() || item.admin.name,
                      '{{organization_name}}': item.organization.name,
                      '{{platform_name}}': 'Cacumator Mentorship Platform',
                      '{{document_version}}': currentAgreement.version,
                    }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                  <p className="font-medium text-[var(--text)]">Confirmation gate</p>
                  <p className="mt-2">I, {acknowledgedName.trim() || item.admin.name}, confirm that I have read and understood this agreement on behalf of {item.organization.name}.</p>
                </div>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span className="font-medium text-[var(--text)]">Typed name</span>
                  <Input value={acknowledgedName} onChange={(event) => setAcknowledgedName(event.target.value)} />
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[var(--border)]" />
                  <span>I confirm that I have read and understood this agreement.</span>
                </label>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                  <p>Read progress: <span className="font-medium text-[var(--text)]">{readerReachedEnd ? 'Completed' : 'Scroll to the end'}</span></p>
                </div>
                <div className="mt-auto flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setAgreementCode(null)}>Close</Button>
                  <Button onClick={() => assentMutation.mutate()} disabled={!canSubmitAgreement || assentMutation.isPending}>
                    {assentMutation.isPending ? 'Recording...' : 'Record assent'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistCard({ icon: Icon, label, detail, done }: { icon: typeof MailCheck; label: string; detail: string; done: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--surface-2)] text-[var(--primary)]'}`}><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
          <p className="text-xs text-[var(--muted)]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block space-y-2 text-sm text-[var(--muted)]"><span className="font-medium text-[var(--text)]">{label}{required ? ' *' : ''}</span>{children}</label>;
}

function WideField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2 text-sm text-[var(--muted)] md:col-span-2"><span className="font-medium text-[var(--text)]">{label}</span>{children}</label>;
}

function ModeCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${active ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'}`}>
      <p className="font-medium">{label}</p>
    </button>
  );
}
