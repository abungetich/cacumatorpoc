import { GrantOpportunityStatus, GrantSourceType, Prisma } from "@prisma/client";
import { parseFitMatrix } from "@/lib/grants/service-support-monetary";
import type { GrantOpportunityLot, GrantWorkspaceOpportunity } from "@/lib/grants/service-support-types";

export function mapGrantOpportunity(
  item: {
    id: string;
    title: string;
    funderName: string;
    description: string | null;
    status: GrantOpportunityStatus;
    sourceType: GrantSourceType | null;
    sourceReference: string | null;
    sourceUrl: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    deadline: Date;
    currencyCode: string;
    amountMinor: bigint;
    fitScore: number | null;
    fitMatrix: Prisma.JsonValue | null;
    scoredAt: Date | null;
    country: string | null;
    school: { name: string } | null;
    partner: { name: string } | null;
    _count: { applications: number };
    createdAt: Date;
  },
): GrantWorkspaceOpportunity {
  return {
    id: item.id,
    title: item.title,
    funderName: item.funderName,
    description: item.description,
    status: item.status,
    sourceType: item.sourceType,
    sourceReference: item.sourceReference,
    sourceUrl: item.sourceUrl,
    attachmentUrl: item.attachmentUrl,
    attachmentName: item.attachmentName,
    deadline: item.deadline.toISOString(),
    currencyCode: item.currencyCode,
    amountMinor: item.amountMinor.toString(),
    fitScore: item.fitScore,
    fitMatrix: parseFitMatrix(item.fitMatrix),
    scoredAt: item.scoredAt ? item.scoredAt.toISOString() : null,
    country: item.country,
    schoolName: item.school?.name ?? "Global",
    partnerName: item.partner?.name ?? "Independent",
    applicationsCount: item._count.applications,
    createdAt: item.createdAt.toISOString(),
  };
}

export function mapGrantOpportunityLot(item: {
  id: string;
  description: string;
  quantity: number;
  minBudgetMinor: bigint;
  maxBudgetMinor: bigint;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): GrantOpportunityLot {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    minBudgetMinor: item.minBudgetMinor.toString(),
    maxBudgetMinor: item.maxBudgetMinor.toString(),
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
