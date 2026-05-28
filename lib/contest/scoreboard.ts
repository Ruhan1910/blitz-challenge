import { Contest, ContestProblem, ContestSubmission, Scoreboard, ScoreboardEntry, ScoreboardProblemState } from "@/lib/contest/types";

function buildProblemState(): ScoreboardProblemState {
  return {
    solved: false,
    attempts: 0,
    lastAttemptAt: null,
    solveTimeSeconds: null,
    firstBlood: false,
  };
}

function getSubmissionsForProblem(
  submissions: ContestSubmission[],
  handles: string[],
  problemId: string,
  since: number
): ContestSubmission[] {
  const handleSet = new Set(handles.map((handle) => handle.toLowerCase()));
  return submissions
    .filter((submission) => handleSet.has(submission.handle.toLowerCase()) && submission.problemId === problemId)
    .filter((submission) => submission.submittedAt >= since)
    .sort((a, b) => a.submittedAt - b.submittedAt);
}

function computeFirstBloods(contest: Contest): Record<string, string> {
  const firstBlood: Record<string, string> = {};
  const startTime = contest.settings.startTime || contest.createdAt;

  for (const problem of contest.problems) {
    const relevant = contest.submissions
      .filter((submission) => submission.problemId === problem.id)
      .filter((submission) => submission.verdict === "OK")
      .filter((submission) => submission.submittedAt >= startTime)
      .sort((a, b) => a.submittedAt - b.submittedAt);

    const first = relevant[0];
    if (first) firstBlood[problem.id] = first.handle;
  }

  return firstBlood;
}

function getProblemId(problem: ContestProblem): string {
  return problem.id;
}

export function buildScoreboard(contest: Contest): Scoreboard {
  const startTime = contest.settings.startTime || contest.createdAt;
  const firstBloods = computeFirstBloods(contest);

  const entries: ScoreboardEntry[] = contest.participants.map((participant) => {
    const problems: Record<string, ScoreboardProblemState> = {};
    let solvedCount = 0;
    let penaltyMinutes = 0;
    let totalScore = 0;
    const handles = participant.handles.map((handle) => handle.handle);

    for (const problem of contest.problems) {
      const key = getProblemId(problem);
      const submissions = getSubmissionsForProblem(
        contest.submissions,
        handles,
        problem.id,
        startTime
      );

      const state = buildProblemState();
      problems[key] = state;

      for (const submission of submissions) {
        if (state.solved) continue;
        state.attempts += 1;
        state.lastAttemptAt = submission.submittedAt;

        if (submission.verdict === "OK") {
          state.solved = true;
          state.solveTimeSeconds = Math.floor((submission.submittedAt - startTime) / 1000);
          solvedCount += 1;

          if (contest.settings.rules.rankingType === "score" || contest.settings.rules.rankingType === "custom") {
            totalScore += problem.points;
          }

          if (firstBloods[problem.id] === submission.handle) {
            state.firstBlood = true;
            totalScore += contest.settings.rules.firstSolveBonus;
          }
        }
      }

      if (state.solved && contest.settings.rules.rankingType === "icpc") {
        penaltyMinutes += Math.floor((state.solveTimeSeconds || 0) / 60) +
          (state.attempts - 1) * contest.settings.rules.wrongSubmissionPenaltyMinutes;
      }

      if (state.solved && contest.settings.rules.rankingType === "penalty") {
        penaltyMinutes += (state.attempts - 1) * contest.settings.rules.wrongSubmissionPenaltyMinutes;
      }

      if (contest.settings.rules.rankingType === "score") {
        penaltyMinutes += state.solved ? 0 : state.attempts * contest.settings.rules.attemptPenalty;
      }
    }

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      solvedCount,
      penaltyMinutes,
      totalScore,
      problems,
    };
  });

  entries.sort((a, b) => {
    if (contest.settings.rules.rankingType === "score") {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    } else {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      if (a.penaltyMinutes !== b.penaltyMinutes) return a.penaltyMinutes - b.penaltyMinutes;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const freezeSeconds = contest.settings.rules.frozenScoreboardMinutes * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const endSeconds = Math.floor(((contest.settings.startTime || contest.createdAt) + contest.settings.durationMinutes * 60 * 1000) / 1000);
  const frozen = contest.status === "running" && freezeSeconds > 0 && nowSeconds >= endSeconds - freezeSeconds;

  return {
    contestId: contest.id,
    updatedAt: Date.now(),
    frozen,
    entries,
  };
}
