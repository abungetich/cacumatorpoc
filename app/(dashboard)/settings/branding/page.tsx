"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ImageUp, MessageSquareQuote, Save, ShieldCheck, Type, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { PlatformLogo } from "@/components/branding/platform-logo";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { hasPermission } from "@/lib/permissions";
import {
  fetchPlatformBranding,
  updatePlatformBranding,
  uploadPlatformLogo,
} from "@/lib/platform-branding-actions";

export default function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const canManage = hasPermission(user?.role, "platform.branding.manage");

  const brandingQuery = useQuery({
    queryKey: ["platform-branding"],
    queryFn: fetchPlatformBranding,
    enabled: canManage,
  });

  const [platformName, setPlatformName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ceoName, setCeoName] = useState("");
  const [ceoTitle, setCeoTitle] = useState("");
  const [ceoWelcomeMessage, setCeoWelcomeMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!brandingQuery.data?.item) {
      return;
    }

    setPlatformName(brandingQuery.data.item.platformName);
    setLogoUrl(brandingQuery.data.item.logoUrl);
    setCeoName(brandingQuery.data.item.ceoName);
    setCeoTitle(brandingQuery.data.item.ceoTitle);
    setCeoWelcomeMessage(brandingQuery.data.item.ceoWelcomeMessage);
  }, [brandingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePlatformBranding({
        platformName: platformName.trim(),
        logoUrl,
        ceoName: ceoName.trim(),
        ceoTitle: ceoTitle.trim(),
        ceoWelcomeMessage: ceoWelcomeMessage.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-branding"] });
      router.refresh();
      pushToast({
        title: "Branding updated",
        description: "Platform logo, brand name, and CEO welcome message have been saved.",
        variant: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not update branding",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const dirty = useMemo(() => {
    const current = brandingQuery.data?.item;
    if (!current) {
      return false;
    }

    return (
      current.platformName !== platformName.trim() ||
      current.logoUrl !== logoUrl ||
      current.ceoName !== ceoName.trim() ||
      current.ceoTitle !== ceoTitle.trim() ||
      current.ceoWelcomeMessage !== ceoWelcomeMessage.trim()
    );
  }, [brandingQuery.data?.item, ceoName, ceoTitle, ceoWelcomeMessage, logoUrl, platformName]);

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const uploadedLogoUrl = await uploadPlatformLogo(file);
      setLogoUrl(uploadedLogoUrl);
      pushToast({
        title: "Logo uploaded",
        description: "Review the preview, then save branding to publish it.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could not upload logo",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  if (!canManage) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only platform admins can manage platform branding for the portal." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,white),var(--surface))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Portal Administration</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--text)]">Platform Branding</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Save the platform logo, display name, and CEO welcome content from the UI. This surface is only for platform admins and does not replace organization or school branding.
        </p>
      </section>

      {brandingQuery.isLoading ? <SectionSkeleton rows={4} /> : null}
      {brandingQuery.error ? (
        <ErrorState
          title="Could not load branding"
          description={brandingQuery.error.message || "Try again."}
          onRetry={() => void brandingQuery.refetch()}
        />
      ) : null}

      {!brandingQuery.isLoading && !brandingQuery.error ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="space-y-4 rounded-[26px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Live Preview</p>
                <h2 className="text-lg font-semibold text-[var(--text)]">Current platform brand</h2>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex items-center gap-4">
                <PlatformLogo logoUrl={logoUrl} name={platformName || "Platform"} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-[var(--text)]">{platformName || "Cacumator Mentorship Platform"}</p>
                  <p className="text-sm text-[var(--muted)]">Shown on public entry routes and the internal shell.</p>
                </div>
              </div>
              <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{ceoName || "Grace Munyiri"}</p>
                    <p className="text-xs text-[var(--muted)]">{ceoTitle || "Chief Executive Officer"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{ceoWelcomeMessage || "Welcome message preview."}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-5 rounded-[26px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[var(--text)]">Platform Name</label>
                <div className="relative">
                  <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--primary)]" />
                  <Input
                    value={platformName}
                    onChange={(event) => setPlatformName(event.target.value)}
                    className="pl-9"
                    placeholder="Cacumator Mentorship Platform"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">CEO Name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--primary)]" />
                  <Input value={ceoName} onChange={(event) => setCeoName(event.target.value)} className="pl-9" placeholder="Grace Munyiri" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">CEO Title</label>
                <div className="relative">
                  <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--primary)]" />
                  <Input value={ceoTitle} onChange={(event) => setCeoTitle(event.target.value)} className="pl-9" placeholder="Chief Executive Officer" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[var(--text)]">Platform Logo</label>
                <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <PlatformLogo logoUrl={logoUrl} name={platformName || "Platform"} />
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          Upload SVG, PNG, JPG, or WEBP
                        </p>
                        <p className="text-xs text-[var(--muted)]">Max 5MB. Save branding after upload to publish the new logo.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface)]">
                        <ImageUp className="h-4 w-4 text-[var(--primary)]" />
                        {isUploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                        <input type="file" accept=".svg,image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                      </label>
                      {logoUrl ? (
                        <Button variant="secondary" onClick={() => setLogoUrl(null)}>
                          Remove Logo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[var(--text)]">CEO Welcome Message</label>
                <div className="relative">
                  <MessageSquareQuote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--primary)]" />
                  <Textarea
                    rows={5}
                    value={ceoWelcomeMessage}
                    onChange={(event) => setCeoWelcomeMessage(event.target.value)}
                    className="pl-9"
                    placeholder="Write a public-facing welcome note from the CEO."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void saveMutation.mutateAsync()}
                disabled={!dirty || saveMutation.isPending || !platformName.trim() || !ceoName.trim() || !ceoTitle.trim() || !ceoWelcomeMessage.trim()}
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Branding"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
