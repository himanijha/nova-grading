// The final-interview deliberations board. Unlike the coffee chat
// deliberations, nobody picks a bucket by hand here: the bucket a candidate
// lands in, and the score used to rank them within it, both come from the
// two interviewers' scorecards. A drag only reorders within a bucket; it
// can't move someone to a different one, since the bucket isn't a field to
// set — it's the scorecards talking.

import { prisma } from "@/lib/db";

// Same order as lib/interviewScripts.js VERDICTS, ranked best to worst so a
// disagreement between two interviewers can be averaged and rounded.
export const BUCKETS = [
  { key: "STRONG_ACCEPT", label: "Strong accept", icon: "✅✅", rank: 0 },
  { key: "SOFT_YES", label: "Soft yes", icon: "✅", rank: 1 },
  { key: "MAYBE", label: "Maybe", icon: "🤔", rank: 2 },
  { key: "NO", label: "No", icon: "❌", rank: 3 },
];

const RANK_OF = Object.fromEntries(BUCKETS.map((b) => [b.key, b.rank]));
const BUCKET_OF_RANK = Object.fromEntries(BUCKETS.map((b) => [b.rank, b.key]));

export const bucketMeta = (key) => BUCKETS.find((b) => b.key === key) || null;

// The four rubric categories, identical ids across the dev and design
// rubrics (see lib/interviewScripts.js) — only the wording differs.
export const SCORE_CATEGORIES = [
  { id: "behavioral", label: "Behavioral" },
  { id: "technical", label: "Technical / design" },
  { id: "collaboration", label: "Collaboration" },
  { id: "nova_fit", label: "Nova fit" },
];

/** One scorecard's average across its four 1-5 rubric categories, or null if none are scored. */
function rubricAverage(rubricJson) {
  const rubric = JSON.parse(rubricJson || "{}");
  const values = SCORE_CATEGORIES.map((c) => Number(rubric[c.id])).filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Combine up to two interviewers' verdicts and rubric scores for a candidate
 * into one bucket and one score. Scorecards without a verdict don't count —
 * a candidate needs at least one verdict to show up at all. When the two
 * verdicts disagree, their ranks are averaged and rounded to the nearest
 * bucket (so Strong accept + No lands on Maybe).
 */
export function summarizeScorecards(scorecards) {
  const withVerdict = scorecards.filter((s) => s.verdict && RANK_OF[s.verdict] !== undefined);
  if (withVerdict.length === 0) return null;

  const avgRank =
    withVerdict.reduce((sum, s) => sum + RANK_OF[s.verdict], 0) / withVerdict.length;
  const bucket = BUCKET_OF_RANK[Math.min(3, Math.max(0, Math.round(avgRank)))];

  const perCategory = Object.fromEntries(
    SCORE_CATEGORIES.map((c) => {
      const values = scorecards
        .map((s) => Number(JSON.parse(s.rubricJson || "{}")[c.id]))
        .filter((v) => Number.isFinite(v));
      return [c.id, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null];
    })
  );

  const scores = withVerdict.map((s) => rubricAverage(s.rubricJson)).filter((v) => v != null);
  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  return { bucket, score, perCategory };
}

/**
 * Bring the ranking table in line with who currently has an interview
 * verdict: drop anyone who no longer does, and add anyone new at the end of
 * their bucket among the people already there, ordered by score. Existing
 * manual order is left untouched. Returns the full ranking, ordered,
 * annotated with each person's current bucket and score.
 */
export async function syncInterviewDeliberationOrder(summaries) {
  // summaries: Map<applicantId, { bucket, score, perCategory }>
  const eligible = new Set(summaries.keys());

  const existing = await prisma.interviewDeliberationVerdict.findMany({
    orderBy: { position: "asc" },
    select: { applicantId: true },
  });

  const stale = existing.filter((r) => !eligible.has(r.applicantId)).map((r) => r.applicantId);
  if (stale.length) {
    await prisma.interviewDeliberationVerdict.deleteMany({ where: { applicantId: { in: stale } } });
  }

  let ordered = existing.map((r) => r.applicantId).filter((id) => eligible.has(id));
  const newIds = [...eligible].filter((id) => !ordered.includes(id));

  // Place each new person after the last person in the ranking whose bucket
  // is at least as good, and ahead of anyone with a lower score in the same
  // bucket — so a fresh scorecard doesn't jump the queue within its bucket.
  for (const id of newIds) {
    const rank = RANK_OF[summaries.get(id).bucket];
    const score = summaries.get(id).score ?? -Infinity;
    let at = ordered.length;
    for (let i = 0; i < ordered.length; i++) {
      const other = summaries.get(ordered[i]);
      const otherRank = RANK_OF[other.bucket];
      if (otherRank > rank) {
        at = i;
        break;
      }
      if (otherRank === rank && (other.score ?? -Infinity) < score) {
        at = i;
        break;
      }
    }
    ordered.splice(at, 0, id);
  }

  if (newIds.length || stale.length) {
    await prisma.$transaction(
      ordered.map((applicantId, position) =>
        prisma.interviewDeliberationVerdict.upsert({
          where: { applicantId },
          create: { applicantId, position },
          update: { position },
        })
      )
    );
  }

  return ordered;
}

/**
 * Put a new order into the slots a group of people occupy, same shape as
 * lib/deliberation.js's reorderWithin. `ranking` is the whole order,
 * `memberIds` the people being reordered (in their current order), and
 * `newMemberOrder` the same people in their new order.
 */
export function reorderWithin(ranking, memberIds, newMemberOrder) {
  const members = new Set(memberIds);
  let k = 0;
  return ranking.map((id) => (members.has(id) ? newMemberOrder[k++] : id));
}
