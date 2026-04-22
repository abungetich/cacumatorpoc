import { MentorDetailWorkspace } from "@/components/people/mentor-detail-workspace";

export default async function MentorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentorUserId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { mentorUserId } = await params;
  const { tab } = await searchParams;

  return <MentorDetailWorkspace mentorUserId={mentorUserId} initialTab={tab ?? null} />;
}
