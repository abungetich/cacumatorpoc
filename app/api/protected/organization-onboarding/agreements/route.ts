import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { buildValidationError, organizationAgreementAssentSchema } from '@/lib/validation';
import { buildOrganizationOnboardingWorkspace } from '@/lib/organization-onboarding-workspace';
import { getOrganizationAdminContext, syncOrganizationAdminUser } from '@/lib/organization-onboarding';
import { getOrganizationAgreementTemplates } from '@/lib/organization-agreement-templates';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.ORGANIZATION_ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = organizationAgreementAssentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const membership = await getOrganizationAdminContext(session.user.id);
  if (!membership) {
    return NextResponse.json({ message: 'Organization onboarding workspace not found' }, { status: 404 });
  }

  const template = getOrganizationAgreementTemplates({
    financialSupport: membership.organization.financialSupport,
    inKindSupport: membership.organization.inKindSupport,
  }).find((item) => item.code === parsed.data.code);

  if (!template) {
    return NextResponse.json({ message: 'Agreement is not available for this organization' }, { status: 404 });
  }

  await prisma.organizationAgreement.create({
    data: {
      organizationId: membership.organization.id,
      code: template.code,
      title: template.title,
      version: template.version,
      documentBody: template.documentBody,
      documentUrl: template.documentUrl,
      agreedByName: parsed.data.acknowledgedName.trim(),
      agreedByEmail: membership.user.email,
      agreedAt: new Date(),
    },
  });

  const item = await buildOrganizationOnboardingWorkspace(session.user.id);
  const nextStatus = await syncOrganizationAdminUser(session.user.id);

  return NextResponse.json({
    item: item
      ? {
          ...item,
          admin: { ...item.admin, status: nextStatus ?? item.admin.status },
          readyForReview: nextStatus === 'pending' || item.readyForReview,
        }
      : null,
  });
}
