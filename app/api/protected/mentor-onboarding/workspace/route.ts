import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "MENTOR") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const item = await getMentorOnboardingWorkspace(session.user.id);
    if (!item) {
      return NextResponse.json({ message: "Mentor onboarding workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("mentor onboarding workspace failed", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not load onboarding checklist",
      },
      { status: 500 },
    );
  }
}
