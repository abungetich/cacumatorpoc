import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { getRequestMetadata } from "@/lib/request-metadata";
import { scoreGrantOpportunity } from "@/lib/grants/service";
import { buildValidationError, scoreGrantOpportunitySchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ opportunityId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = scoreGrantOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { opportunityId } = await params;

  const result = await scoreGrantOpportunity({
    actor,
    opportunityId,
    timelineScore: parsed.data.timelineScore,
    amountScore: parsed.data.amountScore,
    areaScore: parsed.data.areaScore,
    eligibilityScore: parsed.data.eligibilityScore,
    readinessScore: parsed.data.readinessScore,
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
