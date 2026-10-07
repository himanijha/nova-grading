// Deliberation verdicts after round 3. Five calls, and a ranking that is built
// one person at a time: each verdict sets where someone lands, and a drag can
// move them anywhere after that.

export const VERDICTS = [
  { value: "COME_BACK", label: "Come back", short: "Come back", icon: "↩", rank: 0 },
  { value: "STRONG_ACCEPT", label: "Strong accept", short: "Strong accept", icon: "✅✅", rank: 1 },
  { value: "YES", label: "Yes", short: "Yes", icon: "✅", rank: 2 },
  { value: "MAYBE", label: "Maybe", short: "Maybe", icon: "🤔", rank: 3 },
  { value: "STRONG_NO", label: "Strong no", short: "Strong no", icon: "❌", rank: 4 },
];

const BY_VALUE = Object.fromEntries(VERDICTS.map((v) => [v.value, v]));

export const verdictMeta = (value) => BY_VALUE[value] || null;

export const isVerdict = (value) => Object.hasOwn(BY_VALUE, value);

/**
 * Put `id` into `ranking` (ordered ids, top first) at the place its verdict
 * earns: below everyone with a verdict at least as high, above everyone lower.
 * Come-backs sit at the very top, under any other come-backs.
 * `verdicts` maps applicantId → verdict value for everyone in `ranking`.
 * Returns the new ordered ids, with `id` removed from wherever it was.
 */
export function placeVerdict(ranking, verdicts, id, value) {
  const rest = ranking.filter((x) => x !== id);
  const rank = BY_VALUE[value].rank;
  let at = 0;
  rest.forEach((x, i) => {
    if (BY_VALUE[verdicts[x]].rank <= rank) at = i + 1;
  });
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}
