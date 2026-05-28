import { NextResponse } from "next/server";
import { getContest } from "@/lib/contest/store";
import { buildScoreboard } from "@/lib/contest/scoreboard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const contest = await getContest(contestId);

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const scoreboard = buildScoreboard(contest);
  return NextResponse.json({ scoreboard });
}
