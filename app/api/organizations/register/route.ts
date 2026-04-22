import { Prisma, UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { buildValidationError, registerOrganizationSchema } from '@/lib/validation';
import { sendOrganizationVerificationEmail } from '@/lib/verification/email';
import { issueMentorVerificationToken } from '@/lib/verification/service';

async function buildUniqueSlug(baseName: string) {
  const base = slugify(baseName) || 'organization';
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = registerOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const existing = await prisma.$transaction(async (tx) => {
    const existingOrganization = await tx.organization.findFirst({
      where: {
        OR: [
          { name: { equals: payload.name, mode: 'insensitive' } },
          { adminEmail: payload.adminEmail },
        ],
      },
      select: { id: true },
    });

    const existingUser = await tx.user.findUnique({
      where: { email: payload.adminEmail },
      select: { id: true },
    });

    return { existingOrganization, existingUser };
  });

  if (existing.existingOrganization || existing.existingUser) {
    return NextResponse.json({ message: 'An organization or admin account with these details already exists' }, { status: 409 });
  }

  const slug = await buildUniqueSlug(payload.name);
  const origin = new URL(request.url).origin;
  const tempPassword = await hash(`org:${payload.adminEmail}:${Date.now()}`, 12);
  let verificationUrl = '';
  let expiresAt = new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: payload.name.trim(),
          slug,
          type: payload.type,
          status: 'PENDING_REVIEW',
          logoUrl: payload.logoUrl?.trim() || null,
          website: payload.website?.trim() || null,
          country: payload.country.trim(),
          contactEmail: payload.adminEmail,
          contactPhone: payload.adminPhone.trim(),
          primaryContactName: `${payload.adminFirstName} ${payload.adminLastName}`.trim(),
          adminFirstName: payload.adminFirstName.trim(),
          adminLastName: payload.adminLastName.trim(),
          adminEmail: payload.adminEmail,
          adminPhone: payload.adminPhone.trim(),
          mentorParticipation: payload.mentorParticipation,
          financialSupport: payload.financialSupport,
          inKindSupport: payload.inKindSupport,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: payload.adminEmail,
          password: tempPassword,
          firstName: payload.adminFirstName.trim(),
          lastName: payload.adminLastName.trim(),
          phone: payload.adminPhone.trim(),
          dateOfBirth: new Date('1970-01-01'),
          role: UserRole.ORGANIZATION_ADMIN,
          isActive: false,
        },
        select: { id: true },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      const verification = await issueMentorVerificationToken({
        tx,
        userId: user.id,
        email: payload.adminEmail,
        origin,
      });
      verificationUrl = verification.verificationUrl;
      expiresAt = verification.expiresAt;

      return organization;
    });

    const fullName = `${payload.adminFirstName} ${payload.adminLastName}`.trim();
    const emailResult = await sendOrganizationVerificationEmail({
      to: payload.adminEmail,
      fullName,
      verificationUrl,
      expiresAt,
    });

    return NextResponse.json({
      ok: true,
      email: payload.adminEmail,
      status: 'verify_email',
      item: created,
      verification: { sent: emailResult.sent, reason: emailResult.reason },
      message: emailResult.sent
        ? 'Check your email to confirm the organization admin account before signing in.'
        : 'The organization was created, but the verification email could not be sent automatically.',
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'A duplicate organization or admin account was detected' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Could not register organization' }, { status: 500 });
  }
}
