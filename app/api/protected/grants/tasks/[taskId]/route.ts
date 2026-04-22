import { GrantTaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { deleteGrantTask, updateGrantTask, updateGrantTaskDetails } from "@/lib/grants/service";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateGrantTaskDetailsSchema, updateGrantTaskSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateGrantTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await updateGrantTask({
    actor,
    taskId,
    status: parsed.data.status as GrantTaskStatus,
    completionNotes: parsed.data.completionNotes,
    requestMeta: getRequestMetadata(request),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    item: result.data,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateGrantTaskDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await updateGrantTaskDetails({
    actor,
    taskId,
    title: parsed.data.title,
    description: parsed.data.description,
    section: parsed.data.section,
    assigneeId: parsed.data.assigneeId,
    dueDate: parsed.data.dueDate,
    requestMeta: getRequestMetadata(request),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    item: result.data,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  const result = await deleteGrantTask({
    actor,
    taskId,
    requestMeta: getRequestMetadata(request),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    item: result.data,
  });
}
