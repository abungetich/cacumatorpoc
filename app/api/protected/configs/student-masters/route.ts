import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import {
  EducationLevel,
  EnrollmentStatus,
  MenteeProfileStatus,
  MentoringFormat,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canCreateMentee, getActorContext } from "@/lib/actor-context";
import { resolveMenteeIntakeSnapshot } from "@/lib/mentee-intake";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { parseStudentMasterCsv } from "@/lib/student-master-csv";
import { createMenteeSchema, normalizeEducationLevel } from "@/lib/validation";

const educationLevelMap: Record<string, EducationLevel> = {
  PRIMARY: EducationLevel.PRIMARY,
  SECONDARY: EducationLevel.SECONDARY,
  COLLEGE: EducationLevel.COLLEGE,
  UNIVERSITY: EducationLevel.UNIVERSITY,
  VOCATIONAL: EducationLevel.VOCATIONAL,
};

type UploadError = {
  line: number;
  email: string;
  message: string;
};

type UploadPreview = {
  line: number;
  name: string;
  email: string;
  school: string;
  status: "created" | "validated" | "skipped" | "failed";
  reason?: string;
};

function splitName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "-",
  };
}

function getValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canCreateMentee(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "CSV file is required" }, { status: 400 });
  }

  const schoolIdOverrideRaw = String(formData.get("schoolId") ?? "").trim();
  const schoolIdOverride =
    schoolIdOverrideRaw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolIdOverrideRaw)
      ? schoolIdOverrideRaw
      : "";

  if (schoolIdOverrideRaw && !schoolIdOverride) {
    return NextResponse.json({ message: "Invalid schoolId value" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ message: "Only CSV files are supported" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "CSV file too large (max 5MB)" }, { status: 400 });
  }

  const dryRun = String(formData.get("dryRun") ?? "false").toLowerCase() === "true";
  const csvText = await file.text();
  const parsed = parseStudentMasterCsv(csvText);

  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return NextResponse.json({ message: "CSV appears empty" }, { status: 400 });
  }

  const schoolCache = new Map<string, { id: string; name: string; partnerId: string | null } | null>();
  const errors: UploadError[] = [];
  const preview: UploadPreview[] = [];

  let validated = 0;
  let created = 0;
  let skipped = 0;

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const row = parsed.rows[index];
    const line = index + 2;

    const firstName = getValue(row, ["first_name", "firstname", "given_name"]);
    const lastName = getValue(row, ["last_name", "lastname", "surname", "family_name"]);
    const fullName = getValue(row, ["name", "full_name"]) || `${firstName} ${lastName}`.trim();
    const email = getValue(row, ["email", "student_email"]).toLowerCase();
    const phone = getValue(row, ["phone", "phone_number", "mobile"]);
    const dateOfBirth = getValue(row, ["date_of_birth", "dob", "birth_date"]);
    const rawEducationLevel = getValue(row, ["education_level", "level"]) || "SECONDARY";
    const schoolIdInput = getValue(row, ["school_id", "schoolid"]);
    const schoolNameInput = getValue(row, ["school_name", "school"]);
    const emergencyContactName = getValue(row, ["emergency_contact_name"]) || fullName;
    const emergencyContactPhone = getValue(row, ["emergency_contact_phone"]) || phone;
    const guardianConsentRaw = getValue(row, ["parent_guardian_consent", "guardian_consent"]);

    const normalizedLevel = normalizeEducationLevel(rawEducationLevel as never);
    const educationLevel = educationLevelMap[normalizedLevel];

    if (!educationLevel) {
      errors.push({
        line,
        email,
        message: `Invalid education level '${rawEducationLevel}'`,
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: schoolNameInput || schoolIdInput || "-",
        status: "failed",
        reason: "Invalid education level",
      });
      continue;
    }

    const payload = {
      name: fullName,
      email,
      phone,
      dateOfBirth,
      schoolId: schoolIdInput || undefined,
      school: schoolNameInput || undefined,
      educationLevel: normalizedLevel,
    };

    const validation = createMenteeSchema.safeParse(payload);
    if (!validation.success) {
      errors.push({
        line,
        email,
        message: validation.error.issues[0]?.message ?? "Invalid row format",
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: schoolNameInput || schoolIdInput || "-",
        status: "failed",
        reason: validation.error.issues[0]?.message ?? "Invalid row format",
      });
      continue;
    }

    const schoolCacheKey = schoolIdInput
      ? `id:${schoolIdInput}`
      : schoolNameInput
        ? `name:${schoolNameInput.toLowerCase()}`
        : schoolIdOverride
          ? `id:${schoolIdOverride}`
        : actor.schoolId
          ? `id:${actor.schoolId}`
          : "none";

    if (!schoolCache.has(schoolCacheKey)) {
      let school = null;
      if (schoolIdInput) {
        school = await prisma.school.findUnique({
          where: { id: schoolIdInput },
          select: { id: true, name: true, partnerId: true },
        });
      } else if (schoolIdOverride) {
        school = await prisma.school.findUnique({
          where: { id: schoolIdOverride },
          select: { id: true, name: true, partnerId: true },
        });
      } else if (schoolNameInput) {
        school = await prisma.school.findFirst({
          where: {
            name: {
              contains: schoolNameInput,
              mode: "insensitive",
            },
          },
          select: { id: true, name: true, partnerId: true },
        });
      } else if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
        school = await prisma.school.findUnique({
          where: { id: actor.schoolId },
          select: { id: true, name: true, partnerId: true },
        });
      }

      schoolCache.set(schoolCacheKey, school);
    }

    const school = schoolCache.get(schoolCacheKey);
    if (!school) {
      errors.push({
        line,
        email,
        message: "A valid school is required",
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: schoolNameInput || schoolIdInput || "-",
        status: "failed",
        reason: "A valid school is required",
      });
      continue;
    }

    if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId && school.partnerId !== actor.partnerId) {
      errors.push({
        line,
        email,
        message: "School is outside your partner network",
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: school.name,
        status: "failed",
        reason: "School is outside your partner network",
      });
      continue;
    }

    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId && school.id !== actor.schoolId) {
      errors.push({
        line,
        email,
        message: "School is outside your school scope",
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: school.name,
        status: "failed",
        reason: "School is outside your school scope",
      });
      continue;
    }

    validated += 1;

    if (dryRun) {
      preview.push({
        line,
        name: fullName,
        email,
        school: school.name,
        status: "validated",
      });
      continue;
    }

    const { firstName: resolvedFirstName, lastName: resolvedLastName } = splitName(fullName);
    if (!resolvedFirstName || !resolvedLastName || resolvedLastName === "-") {
      errors.push({
        line,
        email,
        message: "First and last name are required",
      });
      preview.push({
        line,
        name: fullName || "-",
        email,
        school: school.name,
        status: "failed",
        reason: "First and last name are required",
      });
      continue;
    }

    try {
      const dateOfBirthValue = new Date(dateOfBirth);
      const parentGuardianConsent = guardianConsentRaw ? parseBoolean(guardianConsentRaw) : null;
      const intakeSnapshot = resolveMenteeIntakeSnapshot({
        status: MenteeProfileStatus.WAITING,
        dateOfBirth: dateOfBirthValue,
        parentGuardianConsent,
      });
      const passwordHash = await hash(randomUUID(), 12);
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          phone,
          dateOfBirth: dateOfBirthValue,
          role: UserRole.MENTEE,
          schoolId: school.id,
          isActive: true,
          menteeProfile: {
            create: {
              schoolId: school.id,
              educationLevel,
              enrollmentStatus: EnrollmentStatus.FULL_TIME,
              interests: [],
              preferredFormat: MentoringFormat.HYBRID,
              emergencyContactName,
              emergencyContactPhone,
              parentGuardianConsent,
              status: MenteeProfileStatus.WAITING,
              ...intakeSnapshot,
            },
          },
        },
      });

      created += 1;
      preview.push({
        line,
        name: fullName,
        email,
        school: school.name,
        status: "created",
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skipped += 1;
        preview.push({
          line,
          name: fullName,
          email,
          school: school.name,
          status: "skipped",
          reason: "Email already exists",
        });
        continue;
      }

      errors.push({
        line,
        email,
        message: "Could not create student row",
      });
      preview.push({
        line,
        name: fullName,
        email,
        school: school.name,
        status: "failed",
        reason: "Could not create student row",
      });
    }
  }

  const requestMeta = getRequestMetadata(request);

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "STUDENT_MASTER_UPLOADED",
      entityType: "users",
      entityId: actor.id,
      oldValues: Prisma.JsonNull,
      newValues: {
        fileName: file.name,
        totalRows: parsed.rows.length,
        validated,
        created,
        skipped,
        failed: errors.length,
        dryRun,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  if (!dryRun && created > 0) {
    invalidatePeopleOverviewCache();
  }

  return NextResponse.json({
    ok: true,
    summary: {
      totalRows: parsed.rows.length,
      validated,
      created,
      skipped,
      failed: errors.length,
      dryRun,
    },
    errors: errors.slice(0, 100),
    preview: preview.slice(0, 150),
  });
}
