import { redirect } from "next/navigation";

export default async function StatusRedirect({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  redirect(`/contest/${contestId}?tab=status`);
}
