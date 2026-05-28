import { NextResponse } from "next/server";
import { getContest, setContest } from "@/lib/contest/store";
import { syncContestSubmissions } from "@/lib/contest/sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const contest = await getContest(contestId);

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const updated = await syncContestSubmissions(contest);
  await setContest(contestId, updated);

  return NextResponse.json({ contest: updated });
}
