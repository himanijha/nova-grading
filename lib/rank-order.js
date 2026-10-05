// Dragging someone in Rankings gives them a rankScore: a stand-in for their
// average that sorts them where they were dropped. Being a score, it also
// decides pass/fail against the cutoff, so dropping someone above the cut line
// passes them, and moving the slider later treats them like anyone else.

// Enough to separate ties without crossing a real gap: averages are rounded to
// hundredths, and cutoffs move in quarters.
const NUDGE = 1e-6;
// Room given when dropped past the first or last movable row.
const EDGE = 0.5;

/** The score someone ranks and is judged by: where they were put, else their average. */
export const effective = (a) => a.rankScore ?? a.average;

/**
 * New rankScores for dropping `movedId` at `index` of `items` (in rank order,
 * highest first, without the moved one). Items are { id, value }; one may be
 * { fixed: true } for the cut line, which never moves. Returns [{ id, rankScore }]:
 * the moved row, plus anyone above it that had to be raised to break a tie.
 */
export function placeAt(items, movedId, index) {
  const upper = items[index - 1];
  const lower = items[index];
  if (!upper && !lower) return [];
  if (!upper) return [{ id: movedId, rankScore: lower.value + EDGE }];
  if (!lower) return [{ id: movedId, rankScore: upper.value - EDGE }];
  if (upper.value > lower.value) {
    return [{ id: movedId, rankScore: (upper.value + lower.value) / 2 }];
  }

  // Dropped between two equal scores: sit just above the lower one, and lift
  // the tied rows above so they stay above.
  let prev = lower.value + NUDGE;
  const out = [{ id: movedId, rankScore: prev }];
  for (let j = index - 1; j >= 0 && !items[j].fixed && items[j].value <= prev; j--) {
    prev += NUDGE;
    out.push({ id: items[j].id, rankScore: prev });
  }
  return out;
}
