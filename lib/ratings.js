// Interview-selection ratings. Deliberately separate from the rubric scores:
// the grading round asks "how strong is this application", this round asks
// "do we want to interview this person", and the two do not always agree.

export const RATINGS = [
  { value: "DOUBLE_UP", label: "Double thumbs up", short: "++", icon: "👍👍", points: 3 },
  { value: "UP",        label: "Thumbs up",        short: "+",  icon: "👍",   points: 2 },
  { value: "MAYBE",     label: "Maybe",            short: "~",  icon: "🤔",   points: 1 },
  { value: "DOWN",      label: "Thumbs down",      short: "−",  icon: "👎",   points: 0 },
];

export const RATING_VALUES = RATINGS.map((r) => r.value);

const BY_VALUE = Object.fromEntries(RATINGS.map((r) => [r.value, r]));

export const ratingMeta = (value) => BY_VALUE[value] || null;

export const isRating = (value) => RATING_VALUES.includes(value);

/**
 * Average points across everyone who rated them. An average rather than a sum
 * so that a person three people love is not beaten by one six people shrugged
 * at — the count is shown alongside so thin evidence stays visible.
 */
export function ratingScore(ratings) {
  if (!ratings.length) return null;
  const total = ratings.reduce((sum, r) => sum + (BY_VALUE[r.value]?.points ?? 0), 0);
  return Number((total / ratings.length).toFixed(2));
}

/** Tally per category, in display order. */
export function ratingTally(ratings) {
  return RATINGS.map((r) => ({
    ...r,
    count: ratings.filter((x) => x.value === r.value).length,
  }));
}
