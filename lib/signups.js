// Reading a sign-up sheet: one column per time slot, with people typing their
// own name into a free row underneath. There are no emails, so names are all
// there is to match on. Pure functions, so they run the same in the browser
// (for the review step) and in tests.

// "8:00-9:00pm", "7-8pm (tentative)", "11:30am – 12:30pm". Anchored at the
// start so a note that merely mentions a time is not taken for a slot.
const TIME_RANGE =
  /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_DAY = new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i");
// Nobody's name is this long; it is an instruction someone typed into a cell.
const MAX_NAME = 60;
// How far down to look for the row of times.
const HEADER_ROWS = 6;

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const noParens = (v) => clean(v.replace(/\([^)]*\)/g, " "));

/**
 * The CSV download behind a Google Sheets link, or null if it isn't one.
 * Works for the address-bar link ("…/d/<id>/edit#gid=0") and for a
 * published-to-web link ("…/d/e/<id>/pubhtml"). The URL is rebuilt from the
 * id alone, so the server only ever fetches from docs.google.com.
 */
export function sheetCsvUrl(link) {
  let u;
  try {
    u = new URL(String(link ?? "").trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") return null;
  const gid = (u.hash.match(/gid=(\d+)/) || u.search.match(/gid=(\d+)/) || [])[1];
  const tab = gid ? `&gid=${gid}` : "";
  const published = u.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)/);
  if (published) return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv${tab}`;
  const doc = u.pathname.match(/^\/spreadsheets\/d\/([\w-]+)/);
  if (!doc) return null;
  return `https://docs.google.com/spreadsheets/d/${doc[1]}/export?format=csv${tab}`;
}

const to24 = (hour, meridiem) => (hour % 12) + (meridiem === "pm" ? 12 : 0);

/**
 * When a slot starts, as { month (0-11), day, hour, minute }, or null if the
 * header doesn't say. No year and no time zone: the sheet has neither, so the
 * caller supplies them.
 */
function slotStart(day, time) {
  const date = day.match(MONTH_DAY);
  const t = time.match(TIME_RANGE);
  if (!date || !t) return null;
  const endMeridiem = t[6].toLowerCase();
  let hour = to24(Number(t[1]), (t[3] || endMeridiem).toLowerCase());
  // "11:00-12:00pm" starts in the morning: a bare start time takes the end's
  // am/pm unless that would put it after the end.
  if (!t[3]) {
    const start = hour * 60 + Number(t[2] || 0);
    const end = to24(Number(t[4]), endMeridiem) * 60 + Number(t[5] || 0);
    if (start >= end) hour = (hour + 12) % 24;
  }
  return {
    month: MONTHS.indexOf(date[1].toLowerCase()),
    day: Number(date[2]),
    hour,
    minute: Number(t[2] || 0),
  };
}

/**
 * Turn the sheet's cells (an array of rows, each an array of strings) into
 * slots. The row of times marks which columns are slots; the rows above it
 * say which day, and a day merged across several columns counts for each of
 * them. Without a row of times, the first row's headers are the slots.
 *
 * Returns { slots: [{ col, label, name, location, start, names }], skipped } — `skipped`
 * is the cells under a slot that were too long to be a name.
 */
export function parseSignupSheet(rows) {
  const grid = (rows || []).map((r) => (Array.isArray(r) ? r : []).map(clean));
  const top = grid.slice(0, HEADER_ROWS);
  const found = top.findIndex((r) => r.some((c) => TIME_RANGE.test(c)));
  const timeRow = found === -1 ? 0 : found;
  const header = grid[timeRow] || [];

  const slots = [];
  const skipped = [];
  header.forEach((cell, col) => {
    const isSlot = found === -1 ? cell && cell.length <= MAX_NAME : TIME_RANGE.test(cell);
    if (!isSlot) return;

    const day = grid
      .slice(0, timeRow)
      .map((r) => r.slice(0, col + 1).reverse().find(Boolean) || "")
      .filter(Boolean)
      .join(" ");

    const names = [];
    const seen = new Set();
    for (const row of grid.slice(timeRow + 1)) {
      const v = row[col];
      if (!v) continue;
      if (v.length > MAX_NAME) {
        skipped.push(v);
        continue;
      }
      const key = normalizeName(v);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      names.push(v);
    }

    slots.push({
      col,
      label: [day, cell].filter(Boolean).join(" · "),
      name: [noParens(day), noParens(cell)].filter(Boolean).join(", "),
      location: clean((day.match(/\(([^)]*)\)/) || [])[1] || "") || null,
      start: slotStart(day, cell),
      names,
    });
  });

  return { slots, skipped };
}

// The sheet's times are wall-clock times on campus, wherever the server is.
export const EVENT_TZ = "America/Los_Angeles";

/** The moment a wall-clock time ({ year, month (0-11), day, hour, minute }) happens in a time zone. */
export function zonedTime({ year, month, day, hour, minute }, timeZone = EVENT_TZ) {
  const asUtc = Date.UTC(year, month, day, hour, minute);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(new Date(asUtc))
      .map((x) => [x.type, Number(x.value)])
  );
  const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(asUtc - (shown - asUtc));
}

/** "Tue 8pm": short enough for the session switcher on a phone. */
export function sessionName(startsAt, timeZone = EVENT_TZ) {
  const part = (opts) => new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(startsAt);
  const time = part({ hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(/\s/g, "").toLowerCase();
  return `${part({ weekday: "short" })} ${time}`;
}

/** A name as it is compared: lower case, no accents, no punctuation. */
export function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** People ({ id, fullName }) prepared for matchName. */
export function nameIndex(people) {
  return people.map((p) => {
    const norm = normalizeName(p.fullName);
    return { id: p.id, norm, tokens: new Set(norm.split(" ").filter(Boolean)) };
  });
}

/**
 * Who a typed name is. An exact match is trusted; a close one — a middle name
 * or nickname added or dropped, the words in another order, a typo of a
 * letter or two — is offered as a guess for someone to check.
 *
 * Returns { status, applicantId, candidates }: status is "exact", "close",
 * "ambiguous" (several people fit; applicantId is null) or "none".
 */
export function matchName(name, index) {
  const norm = normalizeName(name);
  if (!norm) return { status: "none", applicantId: null, candidates: [] };

  const same = index.filter((p) => p.norm === norm);
  if (same.length === 1) return { status: "exact", applicantId: same[0].id, candidates: [same[0].id] };
  if (same.length > 1) return { status: "ambiguous", applicantId: null, candidates: same.map((p) => p.id) };

  const tokens = new Set(norm.split(" "));
  const within = (small, big) => small.size >= 2 && [...small].every((t) => big.has(t));
  const close = index.filter(
    (p) =>
      within(tokens, p.tokens) ||
      within(p.tokens, tokens) ||
      (norm.length >= 6 && Math.abs(norm.length - p.norm.length) <= 2 && editDistance(norm, p.norm) <= 2)
  );
  if (close.length === 1) return { status: "close", applicantId: close[0].id, candidates: [close[0].id] };
  if (close.length > 1) return { status: "ambiguous", applicantId: null, candidates: close.map((p) => p.id) };
  return { status: "none", applicantId: null, candidates: [] };
}
