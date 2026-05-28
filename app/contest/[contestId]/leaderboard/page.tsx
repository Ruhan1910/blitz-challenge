import { redirect } from "next/navigation";

export default async function LeaderboardRedirect({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  redirect(`/contest/${contestId}?tab=leaderboard`);
}
