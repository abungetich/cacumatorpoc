import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PublicOrganizationPayload = Prisma.OrganizationGetPayload<{
  select: {
    id: true;
    slug: true;
    name: true;
    logoUrl: true;
    type: true;
    country: true;
    county: true;
    city: true;
    website: true;
    contactEmail: true;
    contactPhone: true;
    primaryContactName: true;
    primaryContactTitle: true;
    description: true;
    mission: true;
    mentorParticipation: true;
    financialSupport: true;
    inKindSupport: true;
    schoolsOfInterest: true;
    partner: {
      select: {
        id: true;
        name: true;
      };
    };
    _count: {
      select: {
        memberships: true;
        agreements: true;
      };
    };
  };
}>;

function extractSchoolsOfInterest(value: Prisma.JsonValue | null) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapPublicOrganization(item: PublicOrganizationPayload) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    logoUrl: item.logoUrl,
    type: item.type,
    country: item.country,
    county: item.county,
    city: item.city,
    website: item.website,
    contactEmail: item.contactEmail,
    contactPhone: item.contactPhone,
    primaryContactName: item.primaryContactName,
    primaryContactTitle: item.primaryContactTitle,
    description: item.description,
    mission: item.mission,
    mentorParticipation: item.mentorParticipation,
    financialSupport: item.financialSupport,
    inKindSupport: item.inKindSupport,
    partner: item.partner,
    schoolsOfInterest: extractSchoolsOfInterest(item.schoolsOfInterest),
    counts: {
      memberships: item._count.memberships,
      agreements: item._count.agreements,
    },
  };
}

const publicOrganizationSelect = {
  id: true,
  slug: true,
  name: true,
  logoUrl: true,
  type: true,
  country: true,
  county: true,
  city: true,
  website: true,
  contactEmail: true,
  contactPhone: true,
  primaryContactName: true,
  primaryContactTitle: true,
  description: true,
  mission: true,
  mentorParticipation: true,
  financialSupport: true,
  inKindSupport: true,
  schoolsOfInterest: true,
  partner: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      memberships: true,
      agreements: true,
    },
  },
} satisfies Prisma.OrganizationSelect;

export async function listPublicMentorOrganizations(search?: string) {
  const term = search?.trim();
  const items = await prisma.organization.findMany({
    where: {
      status: "ACTIVE",
      mentorParticipation: true,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { country: { contains: term, mode: "insensitive" } },
              { county: { contains: term, mode: "insensitive" } },
              { city: { contains: term, mode: "insensitive" } },
              { mission: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: publicOrganizationSelect,
    orderBy: [{ name: "asc" }],
  });

  return items.map(mapPublicOrganization);
}

export async function getPublicOrganizationBySlug(slug: string) {
  const item = await prisma.organization.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
    select: publicOrganizationSelect,
  });

  if (!item) {
    return null;
  }

  return mapPublicOrganization(item);
}
