import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildMentorConsentPacket } from "@/lib/mentor-consent-packet";

export async function GET(_: Request, { params }: { params: Promise<{ settingId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { settingId } = await params;
    const pdfBytes = await buildMentorConsentPacket(session.user.id, settingId);

    if (!pdfBytes) {
      return NextResponse.json({ message: "Signed consent record not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="mentor-consent-record.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("mentor consent pdf failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not generate consent PDF" },
      { status: 500 },
    );
  }
}
