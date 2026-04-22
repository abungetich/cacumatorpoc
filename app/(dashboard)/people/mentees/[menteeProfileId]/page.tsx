import { MenteeDetailWorkspace } from '@/components/people/mentee-detail-workspace';

export default async function PeopleMenteeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ menteeProfileId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { menteeProfileId } = await params;
  const { tab } = await searchParams;
  return <MenteeDetailWorkspace menteeProfileId={menteeProfileId} initialTab={tab ?? null} />;
}
