import { OrganizationStatus, type OrganizationAgreement, type User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOrganizationAgreementTemplates } from '@/lib/organization-agreement-templates';

export async function getOrganizationAdminContext(userId: string) {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PENDING'] },
      role: 'ADMIN',
    },
    select: {
      id: true,
      role: true,
      status: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          logoUrl: true,
          registrationNumber: true,
          website: true,
          description: true,
          mission: true,
          country: true,
          county: true,
          city: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          primaryContactName: true,
          primaryContactTitle: true,
          adminFirstName: true,
          adminLastName: true,
          adminEmail: true,
          adminPhone: true,
          adminTitle: true,
          mentorParticipation: true,
          financialSupport: true,
          inKindSupport: true,
          schoolsOfInterest: true,
          agreements: {
            orderBy: { agreedAt: 'desc' },
            select: {
              id: true,
              code: true,
              title: true,
              version: true,
              documentBody: true,
              documentUrl: true,
              agreedByName: true,
              agreedByEmail: true,
              agreedAt: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          emailVerifiedAt: true,
          isActive: true,
          role: true,
          timeZone: true,
        },
      },
    },
  });

  return membership;
}

function hasRealAccountProfile(user: Pick<User, 'phone' | 'dateOfBirth'>) {
  return user.phone !== 'PENDING_PROFILE' && !user.dateOfBirth.toISOString().startsWith('1970-01-01');
}

function hasOrganizationProfile(org: {
  primaryContactName: string;
  contactEmail: string;
  country: string;
}) {
  return Boolean(org.primaryContactName.trim() && org.contactEmail.trim() && org.country.trim());
}

export function deriveOrganizationAdminStatus(input: {
  user: Pick<User, 'emailVerifiedAt' | 'isActive' | 'phone' | 'dateOfBirth'>;
  organization: {
    status: OrganizationStatus;
    mentorParticipation: boolean;
    financialSupport: boolean;
    inKindSupport: boolean;
    primaryContactName: string;
    contactEmail: string;
    country: string;
    agreements: Pick<OrganizationAgreement, 'code' | 'version'>[];
  };
}) {
  if (!input.user.emailVerifiedAt) {
    return 'pending' as const;
  }

  const accountComplete = hasRealAccountProfile(input.user);
  const organizationProfileComplete = hasOrganizationProfile(input.organization);
  const requiredAgreementCodes = new Set(
    getOrganizationAgreementTemplates({
      financialSupport: input.organization.financialSupport,
      inKindSupport: input.organization.inKindSupport,
    }).map((template) => `${template.code}:${template.version}`),
  );
  const assentedCodes = new Set(input.organization.agreements.map((agreement) => `${agreement.code}:${agreement.version}`));
  const agreementsComplete = [...requiredAgreementCodes].every((code) => assentedCodes.has(code));

  if (!accountComplete || !organizationProfileComplete || !agreementsComplete) {
    return 'onboarding' as const;
  }

  if (!input.user.isActive || input.organization.status !== 'ACTIVE') {
    return 'pending' as const;
  }

  return 'active' as const;
}

export async function syncOrganizationAdminUser(userId: string) {
  const membership = await getOrganizationAdminContext(userId);
  if (!membership) {
    return null;
  }

  const status = deriveOrganizationAdminStatus({
    user: membership.user,
    organization: membership.organization,
  });

  const shouldBeActive = status === 'active';
  if (membership.user.isActive !== shouldBeActive) {
    await prisma.user.update({
      where: { id: membership.user.id },
      data: { isActive: shouldBeActive },
    });
  }

  return status;
}
