"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Mail, Phone, Plus, RefreshCw, UserRound, UserSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { hasPermission } from "@/lib/permissions";
import { createTenantUser, fetchTenantUsers, reInviteTenantUser } from "@/lib/settings-users-actions";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "PLATFORM_ADMIN" | "PARTNER_ADMIN" | "SCHOOL_ADMIN";
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "PARTNER_ADMIN",
};

function inviteFallbackDescription(reason: string | null) {
  return reason
    ? `Email dispatch failed: ${reason}. Fresh invite link copied to clipboard.`
    : "Email dispatch failed. Fresh invite link copied to clipboard.";
}

function formatRole(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function TenantUsersPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [reinvitingUserId, setReinvitingUserId] = useState<string | null>(null);

  const canManage = hasPermission(user?.role, "tenant-users.manage");

  const usersQuery = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => fetchTenantUsers(),
    enabled: canManage,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const createUserMutation = useMutation({
    mutationFn: (payload: FormState) => createTenantUser(payload),
    onSuccess: refresh,
  });

  const reInviteMutation = useMutation({
    mutationFn: (userId: string) => reInviteTenantUser(userId),
    onSuccess: refresh,
  });

  const filteredUsers = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, usersQuery.data?.items]);

  if (!canManage) {
    return (
      <Card>
        <EmptyState title="Access Restricted" description="Only platform admins can manage root tenant users." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Root Organization</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text)]">Tenant Users</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Add and manage users under the root tenant scope.</p>
      </section>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            className="max-w-[320px]"
            placeholder="Search by name, email, role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            className="gap-2"
            onClick={() => {
              setForm(emptyForm);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {usersQuery.isLoading ? <SectionSkeleton rows={7} /> : null}
        {usersQuery.error ? (
          <ErrorState
            title="Could not load tenant users"
            description={usersQuery.error.message || "Try again."}
            onRetry={() => void usersQuery.refetch()}
          />
        ) : null}

        {!usersQuery.isLoading && !usersQuery.error ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Last Login</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-[var(--muted)]" colSpan={6}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-[var(--text)]">
                          {item.firstName} {item.lastName}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{item.email}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--muted)]">{formatRole(item.role)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.isActive ? "Active" : "Invited"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--muted)]">{formatDateTime(item.lastLoginAt)}</td>
                      <td className="px-3 py-2 text-xs text-[var(--muted)]">{formatDateTime(item.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          {!item.isActive ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-full p-0"
                              title="Re-send invite"
                              disabled={reInviteMutation.isPending}
                              onClick={async () => {
                                setReinvitingUserId(item.id);
                                try {
                                  const response = await reInviteMutation.mutateAsync(item.id);
                                  if (!response.invite.sent && response.invite.link) {
                                    await navigator.clipboard.writeText(response.invite.link);
                                  }

                                  pushToast({
                                    title: response.invite.sent ? "Invite Re-sent" : "Invite Link Copied",
                                    description: response.invite.sent
                                      ? "A fresh invite has been sent to this user."
                                      : inviteFallbackDescription(response.invite.reason),
                                    variant: "success",
                                  });
                                } catch (error) {
                                  pushToast({
                                    title: "Could not re-send invite",
                                    description: error instanceof Error ? error.message : "Request failed.",
                                    variant: "error",
                                  });
                                } finally {
                                  setReinvitingUserId(null);
                                }
                              }}
                            >
                              <RefreshCw
                                className={`h-4 w-4 text-[var(--primary)] ${
                                  reinvitingUserId === item.id ? "animate-spin" : ""
                                }`}
                              />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Tenant User"
        description="Create a root-organization user for assignments and operations."
        icon={<UserRound className="h-4 w-4" />}
      >
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            try {
              const response = await createUserMutation.mutateAsync(form);
              if (!response.invite.sent && response.invite.link) {
                await navigator.clipboard.writeText(response.invite.link);
              }

              pushToast({
                title: response.invite.sent ? "Invite Sent" : "Invite Link Copied",
                description: response.invite.sent
                  ? "Invitation email sent. User will complete registration from the link."
                  : inviteFallbackDescription(response.invite.reason),
                variant: "success",
              });
              setIsModalOpen(false);
            } catch (error) {
              pushToast({
                title: "Could not create user",
                description: error instanceof Error ? error.message : "Request failed.",
                variant: "error",
              });
            }
          }}
        >
          <LabeledField label="First Name" required icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />}>
            <InputWithIcon
              icon={<UserRound className="h-4 w-4 text-[var(--primary)]" />}
              required
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
          </LabeledField>
          <LabeledField label="Last Name" required icon={<UserSquare2 className="h-4 w-4 text-[var(--primary)]" />}>
            <InputWithIcon
              icon={<UserSquare2 className="h-4 w-4 text-[var(--primary)]" />}
              required
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </LabeledField>
          <LabeledField label="Email" required icon={<Mail className="h-4 w-4 text-[var(--primary)]" />}>
            <InputWithIcon
              icon={<Mail className="h-4 w-4 text-[var(--primary)]" />}
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </LabeledField>
          <LabeledField label="Phone" required icon={<Phone className="h-4 w-4 text-[var(--primary)]" />}>
            <InputWithIcon
              icon={<Phone className="h-4 w-4 text-[var(--primary)]" />}
              required
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </LabeledField>
          <LabeledField label="Role" required icon={<BriefcaseBusiness className="h-4 w-4 text-[var(--primary)]" />}>
            <SelectWithIcon
              icon={<BriefcaseBusiness className="h-4 w-4 text-[var(--primary)]" />}
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as FormState["role"] }))}
            >
              <option value="PARTNER_ADMIN">Partner Admin</option>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="PLATFORM_ADMIN">Platform Admin</option>
            </SelectWithIcon>
          </LabeledField>

          <div className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
            Password and date of birth are captured when the user clicks the invite link and completes registration.
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function LabeledField({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {icon}
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function InputWithIcon({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      <Input className="pl-9" {...props} />
    </div>
  );
}

function SelectWithIcon({
  icon,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      <select
        {...props}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {children}
      </select>
    </div>
  );
}
