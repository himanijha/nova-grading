// The arithmetic behind the meet and greet: splitting a session into groups
// for each round. Pure functions, so they can be tested without a database.

/** Small seedable PRNG (mulberry32), so a shuffle can be reproduced in tests. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// A repeat meeting costs far more than a repeat symbol: the point of new
// rounds is new people, and the symbol only matters because graders sit at
// one, so a repeat symbol means the same grader again.
const MET_COST = 10;
const SAME_SYMBOL_COST = 3;
const ATTEMPTS = 30;

/**
 * Split `members` across `groupIds` for one round.
 *
 * Sizes come out as even as possible (they differ by at most one). Within
 * that, each person goes where they have met the fewest people before, and
 * away from symbols they have already sat at. `history` is the earlier
 * rounds, each a Map(memberId → groupId).
 *
 * Greedy placement depends on the order people are placed in, so it runs a
 * few shuffled orders, keeps the one with the fewest repeats, then swaps
 * pairs of people between groups while any swap makes it better. Swapping
 * never changes a group's size, so the balance holds.
 *
 * Returns Map(memberId → groupId).
 */
export function generateRound(members, groupIds, history = [], rng = Math.random) {
  if (groupIds.length === 0 || members.length === 0) return new Map();

  const met = new Map();
  const sat = new Set();
  for (const round of history) {
    const byGroup = {};
    for (const [m, g] of round) {
      (byGroup[g] ||= []).push(m);
      sat.add(`${m}|${g}`);
    }
    for (const list of Object.values(byGroup)) {
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const k = pairKey(list[i], list[j]);
          met.set(k, (met.get(k) || 0) + 1);
        }
    }
  }

  const n = members.length;
  const g = groupIds.length;
  const base = Math.floor(n / g);
  // How many groups get one extra person when it doesn't divide evenly.
  const bigSlots = n % g;

  let best = null;
  let bestCost = Infinity;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const occupants = Object.fromEntries(groupIds.map((id) => [id, []]));
    let bigUsed = 0;
    let total = 0;
    const result = new Map();

    for (const m of shuffle(members, rng)) {
      let pick = null;
      let pickCost = Infinity;
      let ties = 0;
      for (const id of groupIds) {
        const size = occupants[id].length;
        const hasRoom = size < base || (size === base && bigUsed < bigSlots);
        if (!hasRoom) continue;

        let cost = sat.has(`${m}|${id}`) ? SAME_SYMBOL_COST : 0;
        for (const o of occupants[id]) cost += (met.get(pairKey(m, o)) || 0) * MET_COST;
        // Prefer emptier groups on equal cost, so the big slots go last.
        cost += size * 0.01;

        if (cost < pickCost) {
          pick = id;
          pickCost = cost;
          ties = 1;
        } else if (cost === pickCost && rng() < 1 / ++ties) {
          pick = id;
        }
      }
      if (occupants[pick].length === base) bigUsed++;
      occupants[pick].push(m);
      result.set(m, pick);
      total += Math.floor(pickCost);
    }

    if (total < bestCost) {
      best = result;
      bestCost = total;
      if (total === 0) break;
    }
  }

  return improveBySwaps(best, met, sat, rng);
}

function improveBySwaps(placement, met, sat, rng) {
  const groupOf = new Map(placement);
  const members = {};
  for (const [m, g] of groupOf) (members[g] ||= new Set()).add(m);

  const metCost = (m, group, skip) => {
    let c = 0;
    for (const o of members[group]) {
      if (o !== m && o !== skip) c += (met.get(pairKey(m, o)) || 0) * MET_COST;
    }
    return c;
  };
  const symCost = (m, group) => (sat.has(`${m}|${group}`) ? SAME_SYMBOL_COST : 0);

  const people = [...groupOf.keys()];
  for (let pass = 0; pass < 10; pass++) {
    let improved = false;
    for (const m of shuffle(people, rng)) {
      for (const n of people) {
        const a = groupOf.get(m);
        const b = groupOf.get(n);
        if (a === b) continue;
        const before = symCost(m, a) + symCost(n, b) + metCost(m, a, m) + metCost(n, b, n);
        const after = symCost(m, b) + symCost(n, a) + metCost(m, b, n) + metCost(n, a, m);
        if (after < before) {
          members[a].delete(m);
          members[b].delete(n);
          members[a].add(n);
          members[b].add(m);
          groupOf.set(m, b);
          groupOf.set(n, a);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return groupOf;
}
