import { prisma } from '@/lib/prisma';
import { getOrganizationAgreementTemplates } from '@/lib/organization-agreement-templates';
import { deriveOrganizationAdminStatus, getOrganizationAdminContext } from '@/lib/organization-onboarding';

function isAccountComplete(phone: string, dateOfBirth: Date) {
  return phone !== 'PENDING_PROFILE' && !dateOfBirth.toISOString().startsWith('1970-01-01');
}

function isOrganizationProfileComplete(item: {
  primaryContactName: string;
  contactEmail: string;
  country: string;
  contactPhone: string | null;
  adminTitle: string | null;
}) {
  return Boolean(
    item.primaryContactName.trim() &&
      item.contactEmail.trim() &&
      item.country.trim() &&
      item.contactPhone?.trim() &&
      item.adminTitle?.trim(),
  );
}

export async function buildOrganizationOnboardingWorkspace(userId: string) {
  const membership = await getOrganizationAdminContext(userId);
  if (!membership) {
    return null;
  }

  const templates = getOrganizationAgreementTemplates({
    financialSupport: membership.organization.financialSupport,
    inKindSupport: membership.organization.inKindSupport,
  });

  const agreements = templates.map((template) => {
    const completion = membership.organization.agreements.find(
      (agreement) => agreement.code === template.code && agreement.version === template.version,
    );

    return {
      code: template.code,
      title: template.title,
      version: template.version,
      summary: template.summary,
      documentBody: template.documentBody,
      documentUrl: template.documentUrl,
      required: template.required,
      completed: Boolean(completion),
      agreedByName: completion?.agreedByName ?? null,
      agreedAt: completion?.agreedAt.toISOString() ?? null,
    };
  });

  const accountComplete = isAccountComplete(membership.user.phone, membership.user.dateOfBirth);
  const organizationProfileComplete = isOrganizationProfileComplete(membership.organization);
  const completedAgreementCount = agreements.filter((item) => item.completed && item.required).length;
  const requiredAgreementCount = agreements.filter((item) => item.required).length;
  const status = deriveOrganizationAdminStatus({
    user: membership.user,
    organization: membership.organization,
  });

  return {
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      type: membership.organization.type,
      status: membership.organization.status,
      logoUrl: membership.organization.logoUrl,
      website: membership.organization.website,
      registrationNumber: membership.organization.registrationNumber,
      description: membership.organization.description,
      mission: membership.organization.mission,
      country: membership.organization.country,
      county: membership.organization.county,
      city: membership.organization.city,
      address: membership.organization.address,
      contactEmail: membership.organization.contactEmail,
      contactPhone: membership.organization.contactPhone,
      primaryContactName: membership.organization.primaryContactName,
      primaryContactTitle: membership.organization.primaryContactTitle,
      adminTitle: membership.organization.adminTitle,
      mentorParticipation: membership.organization.mentorParticipation,
      financialSupport: membership.organization.financialSupport,
      inKindSupport: membership.organization.inKindSupport,
      schoolsOfInterest: Array.isArray(membership.organization.schoolsOfInterest)
        ? membership.organization.schoolsOfInterest.filter((value): value is string => typeof value === 'string')
        : [],
    },
    admin: {
      name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
      email: membership.user.email,
      phone: membership.user.phone,
      emailVerifiedAt: membership.user.emailVerifiedAt?.toISOString() ?? null,
      status,
    },
    requiredAgreementCount,
    completedAgreementCount,
    accountComplete,
    organizationProfileComplete,
    readyForReview: status !== 'onboarding',
    agreements,
  };
}

export async function saveOrganizationOnboardingProfile(userId: string, payload: {
  organizationName: string;
  type: 'CORPORATE' | 'NGO' | 'FOUNDATION' | 'GOVERNMENT' | 'ALUMNI' | 'ASSOCIATION' | 'COMMUNITY' | 'FAITH_BASED' | 'OTHER';
  logoUrl?: string | null;
  registrationNumber?: string;
  website?: string;
  description?: string;
  mission?: string;
  country: string;
  county?: string;
  city?: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  primaryContactName: string;
  primaryContactTitle?: string;
  adminTitle?: string;
  mentorParticipation: boolean;
  financialSupport: boolean;
  inKindSupport: boolean;
  schoolsOfInterest: string[];
}) {
  const membership = await getOrganizationAdminContext(userId);
  if (!membership) {
    return null;
  }

  await prisma.organization.update({
    where: { id: membership.organization.id },
    data: {
      name: payload.organizationName.trim(),
      type: payload.type,
      logoUrl: payload.logoUrl?.trim() || null,
      registrationNumber: payload.registrationNumber?.trim() || null,
      website: payload.website?.trim() || null,
      description: payload.description?.trim() || null,
      mission: payload.mission?.trim() || null,
      country: payload.country.trim(),
      county: payload.county?.trim() || null,
      city: payload.city?.trim() || null,
      address: payload.address?.trim() || null,
      contactEmail: payload.contactEmail.trim(),
      contactPhone: payload.contactPhone?.trim() || null,
      primaryContactName: payload.primaryContactName.trim(),
      primaryContactTitle: payload.primaryContactTitle?.trim() || null,
      adminTitle: payload.adminTitle?.trim() || null,
      mentorParticipation: payload.mentorParticipation,
      financialSupport: payload.financialSupport,
      inKindSupport: payload.inKindSupport,
      schoolsOfInterest: payload.schoolsOfInterest.length ? payload.schoolsOfInterest : [],
    },
  });

  await prisma.user.update({
    where: { id: membership.user.id },
    data: {
      isActive: false,
    },
  });

  return buildOrganizationOnboardingWorkspace(userId);
}
