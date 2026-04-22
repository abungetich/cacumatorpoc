import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildMentorRecordPacket } from "@/lib/mentor-record-packet";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const pdfBytes = await buildMentorRecordPacket(session.user.id);

    if (!pdfBytes) {
      return NextResponse.json({ message: "Mentor record packet not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="mentor-starter-pack-record.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("mentor records pdf failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not generate mentor record packet" },
      { status: 500 },
    );
  }
}
