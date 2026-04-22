import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { submitGrantApplication } from "@/lib/grants/service";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, submitGrantApplicationSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = submitGrantApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await submitGrantApplication({
    actor,
    applicationId,
    confirmationReference: parsed.data.confirmationReference,
    proofUrl: parsed.data.proofUrl,
    packageVersion: parsed.data.packageVersion,
    notes: parsed.data.notes,
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
