import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth-options';
import { buildValidationError, organizationOnboardingProfileSchema } from '@/lib/validation';
import { buildOrganizationOnboardingWorkspace, saveOrganizationOnboardingProfile } from '@/lib/organization-onboarding-workspace';
import { syncOrganizationAdminUser } from '@/lib/organization-onboarding';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== UserRole.ORGANIZATION_ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const item = await buildOrganizationOnboardingWorkspace(session.user.id);
  if (!item) {
    return NextResponse.json({ message: 'Organization onboarding workspace not found' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(request: NextRequest) {
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

  const parsed = organizationOnboardingProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const item = await saveOrganizationOnboardingProfile(session.user.id, parsed.data);
  if (!item) {
    return NextResponse.json({ message: 'Organization onboarding workspace not found' }, { status: 404 });
  }

  const nextStatus = await syncOrganizationAdminUser(session.user.id);
  return NextResponse.json({ item: { ...item, admin: { ...item.admin, status: nextStatus ?? item.admin.status }, readyForReview: nextStatus === 'pending' || item.readyForReview } });
}
