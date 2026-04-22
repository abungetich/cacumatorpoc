import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createIncidentSchema, buildValidationError } from "@/lib/validation";
import { getActorContext, getAuditScopeWhere } from "@/lib/actor-context";

function toTimestamp(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function parseIncidentRecord(values: Prisma.JsonValue | null) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return null;
  }

  const subject = typeof values.subject === "string" ? values.subject : "Incident";
  const severity =
    typeof values.severity === "string" && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(values.severity)
      ? values.severity
      : "MEDIUM";
  const summary = typeof values.summary === "string" ? values.summary : "";
  const immediateAction = typeof values.immediateAction === "string" ? values.immediateAction : "";

  return {
    subject,
    severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    summary,
    immediateAction,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const scopedWhere = getAuditScopeWhere(actor);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...scopedWhere,
      action: {
        in: ["SAFEGUARDING_INCIDENT_REPORTED", "MENTEE_FLAGGED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: logs.map((log) => {
      const parsed = parseIncidentRecord(log.newValues);
      return {
        id: log.id,
        subject: parsed?.subject ?? (log.action === "MENTEE_FLAGGED" ? "Mentee Flagged" : "Incident"),
        severity: parsed?.severity ?? "MEDIUM",
        summary:
          parsed?.summary ||
          (log.action === "MENTEE_FLAGGED"
            ? `Mentee ${log.entityId.slice(0, 8)} was flagged for safeguarding follow-up.`
            : "Incident details unavailable."),
        immediateAction: parsed?.immediateAction ?? "Review mentorship notes and contact school admin.",
        reportedBy: `${log.user.firstName} ${log.user.lastName}`.trim(),
        timestamp: toTimestamp(log.createdAt),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { subject, summary, severity, immediateAction, mentorshipId } = parsed.data;

  const mentorship = mentorshipId
    ? await prisma.mentorship.findUnique({ where: { id: mentorshipId }, select: { id: true } })
    : null;

  const entityId = mentorship?.id ?? session.user.id;

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SAFEGUARDING_INCIDENT_REPORTED",
      entityType: mentorship ? "mentorships" : "users",
      entityId,
      oldValues: Prisma.JsonNull,
      newValues: {
        subject,
        summary,
        severity,
        immediateAction,
        mentorshipId: mentorship?.id ?? null,
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    },
  });

  return NextResponse.json({ ok: true, message: "Incident reported" });
}
