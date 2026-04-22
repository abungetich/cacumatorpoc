import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { listGrantWorkspace } from "@/lib/grants/service";

const allowedStages = new Set<
  "ALL" | "DISCOVERY" | "APPROVAL" | "WRITING" | "SUBMISSION" | "SUBMITTED" | "CLOSED"
>([
  "ALL",
  "DISCOVERY",
  "APPROVAL",
  "WRITING",
  "SUBMISSION",
  "SUBMITTED",
  "CLOSED",
]);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const stage = (url.searchParams.get("stage")?.trim() ?? "ALL") as
      | "ALL"
      | "DISCOVERY"
      | "APPROVAL"
      | "WRITING"
      | "SUBMISSION"
      | "SUBMITTED"
      | "CLOSED";

    if (!allowedStages.has(stage)) {
      return NextResponse.json({ message: "Invalid stage filter" }, { status: 400 });
    }

    const result = await listGrantWorkspace(actor, {
      search,
      stage,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not load grant workspace",
      },
      { status: 500 },
    );
  }
}
