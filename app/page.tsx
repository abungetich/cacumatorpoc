import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.status === 'pending') {
    redirect('/registration-pending');
  }

  if (session.user.status === 'onboarding') {
    redirect(session.user.role === 'ORGANIZATION_ADMIN' ? '/organization-onboarding' : '/mentor-onboarding');
  }

  redirect('/work-queue');
}
