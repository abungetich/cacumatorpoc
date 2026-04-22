import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildMentorTrainingCertificate } from "@/lib/mentor-training-certificate";

export async function GET(_: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { moduleId } = await params;
    const pdfBytes = await buildMentorTrainingCertificate(session.user.id, moduleId);

    if (!pdfBytes) {
      return NextResponse.json({ message: "Training certificate not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="mentor-training-certificate.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("mentor training certificate failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not generate training certificate" },
      { status: 500 },
    );
  }
}
