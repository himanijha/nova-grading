"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { RATINGS, ratingMeta } from "@/lib/ratings";
import { compareGradYears, gradYearParts, GRAD_YEAR_OPTIONS } from "@/lib/mapping";
import { Mugshot } from "../Mugshot";

const ROLE_LABEL = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Both",
  OTHER: "Other",
  UNKNOWN: "Not specified",
};
const ROLE_ORDER = ["DEVELOPER", "DESIGNER", "BOTH", "OTHER", "UNKNOWN"];

// A rating score is an average of 0–3 points, so the cutoff lives on that
// scale. The default is 2.00 — the room, on average, gave a thumbs up.
const MAX_SCORE = 3;
const DEFAULT_CUTOFF = 2;

/** One year's cutoff slider, with the count it currently admits. */
function YearCutoff({ year, cutoff, above, total, onChange }) {
  const { year: yearLabel, transfer } = gradYearParts(year);
  return (
    <div className="yc-row">
      <div className="yc-year">
        {yearLabel}
        {transfer && <span className="yc-tag">transfer</span>}
      </div>
      <div className="yc-slider">
        <input
          type="range"
          min={0}
          max={MAX_SCORE}
          step={0.05}
          value={cutoff}
          aria-label={`Cutoff rating for ${year}`}
          onChange={(e) => onChange(year, Number(e.target.value))}
        />
      </div>
      <div className="yc-cut">{cutoff.toFixed(2)}</div>
      <div className="yc-count">
        <strong>{above}</strong> of {total}
        <span className="yc-pct">
          {total > 0 ? ` · ${Math.round((above / total) * 100)}%` : ""}
        </span>
      </div>
    </div>
  );
}

export default function InterviewClient({ applicants }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [minRatings, setMinRatings] = useState(1);
  const [openNotes, setOpenNotes] = useState(null);

  // Every year anyone actually applied in, oldest first, transfers after their class.
  const allYears = useMemo(() => {
    const set = new Set(applicants.map((a) => a.gradYear));
    return [...set].sort(compareGradYears);
  }, [applicants]);

  // The filter also offers years nobody has applied in yet, so an empty cohort
  // reads as empty rather than missing.
  const years = useMemo(() => {
    const set = new Set([...GRAD_YEAR_OPTIONS, ...allYears]);
    return [...set].sort(compareGradYears);
  }, [allYears]);

  // One cutoff per graduation year, exactly as on Rankings: each class is
  // competing against itself, not against the seniors.
  const [cutoffs, setCutoffs] = useState({});
  const cutoffFor = (year) => cutoffs[year] ?? DEFAULT_CUTOFF;
  const setCutoff = (year, value) => setCutoffs((c) => ({ ...c, [year]: value }));

  const shown = applicants.filter(
    (a) =>
      a.ratingCount >= minRatings &&
      (roleFilter === "all" || a.roleCategory === roleFilter) &&
      (yearFilter === "all" || a.gradYear === yearFilter)
  );

  const unrated = applicants.filter(
    (a) =>
      a.ratingCount === 0 &&
      (roleFilter === "all" || a.roleCategory === roleFilter) &&
      (yearFilter === "all" || a.gradYear === yearFilter)
  ).length;

  const isAbove = (a) => a.score !== null && a.score >= cutoffFor(a.gradYear);
  const above = shown.filter(isAbove);

  // Where each person sits inside their own class. `shown` arrives sorted by
  // score, so counting as we walk it gives the rank directly.
  const yearRank = useMemo(() => {
    const seen = {};
    const map = {};
    for (const a of shown) {
      seen[a.gradYear] = (seen[a.gradYear] || 0) + 1;
      map[a.id] = seen[a.gradYear];
    }
    return map;
  }, [shown]);

  const singleYear = yearFilter !== "all";
  const visibleYears = singleYear ? [yearFilter] : allYears;

  const yearStats = visibleYears.map((y) => {
    const inYear = shown.filter((a) => a.gradYear === y);
    return {
      year: y,
      total: inYear.length,
      above: inYear.filter(isAbove).length,
    };
  });

  // How the room currently leans, counting each person's strongest support.
  const summary = RATINGS.map((r) => ({
    ...r,
    count: shown.filter((a) => a.tally.find((t) => t.value === r.value)?.count > 0).length,
  }));

  const pct = shown.length ? Math.round((above.length / shown.length) * 100) : 0;

  return (
    <div className="page wide">
      <h1>Interview selection</h1>
      <p className="sub">
        Ranked by the thumbs from Mugshots, not by application scores. Each
        person&apos;s number is the average of their ratings — double thumbs up
        is 3, thumbs up 2, maybe 1, thumbs down 0 — and each graduation year
        carries its own cutoff.
      </p>

      <div className="toolbar">
        <div className="row-inline">
          <label htmlFor="yf">Graduation year</label>
          <select id="yf" className="inp" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="row-inline">
          <label htmlFor="rf">Role</label>
          <select id="rf" className="inp" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="row-inline">
          <label htmlFor="mr">At least</label>
          <select id="mr" className="inp" value={minRatings} onChange={(e) => setMinRatings(Number(e.target.value))}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "rating" : "ratings"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="card">
        <div className="cutoff-grid">
          <div>
            <div className="bd-title">
              {singleYear ? `Above cutoff — ${yearFilter}` : "Above cutoff — all years"}
            </div>
            <div className="hero-num">{above.length}</div>
            <div className="hero-sub">
              of {shown.length} rated {shown.length === 1 ? "person" : "people"} ({pct}%)
              clear the cutoff for their year.
              {unrated > 0 && (
                <>
                  <br />
                  {unrated} {unrated === 1 ? "person has" : "people have"} no rating yet.
                </>
              )}
            </div>
          </div>
          <div>
            <div className="bd-title">Anyone who got…</div>
            {summary.map((r) => (
              <div className="bd-row" key={r.value}>
                <span className="bd-label">
                  {r.icon} {r.label}
                </span>
                <span className="bd-track">
                  <span
                    className="bd-fill"
                    style={{
                      width: `${shown.length ? (r.count / shown.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="bd-val">
                  <strong>{r.count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="yc-block">
          <div className="bd-title">
            {singleYear ? "Cutoff for this year" : "Cutoff per graduation year"}
          </div>
          <div className="yc-head">
            <span />
            <span />
            <span className="yc-cut">Rating</span>
            <span className="yc-count">Interviewing</span>
          </div>
          {yearStats.map((y) => (
            <YearCutoff
              key={y.year}
              year={y.year}
              cutoff={cutoffFor(y.year)}
              above={y.above}
              total={y.total}
              onChange={setCutoff}
            />
          ))}
          {yearStats.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Nobody matches these filters yet.
            </div>
          )}
          {!singleYear && (
            <button
              className="btn"
              style={{ marginTop: 12, padding: "7px 12px" }}
              onClick={() => setCutoffs({})}
            >
              Reset all to {DEFAULT_CUTOFF.toFixed(2)}
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h3>
          Ranked by rating ({shown.length})
          {singleYear ? ` — class of ${yearFilter}` : ""}
        </h3>
        {shown.length === 0 ? (
          <div className="empty">
            Nobody matches these filters yet. Rate people on the Mugshots page.
          </div>
        ) : (
          <table className="tbl rank-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th className="num">In year</th>
                <th>Photo</th>
                <th>Name</th>
                <th>Role</th>
                <th>Grad year</th>
                <th className="num">Score</th>
                <th className="num">Year cutoff</th>
                <th>Ratings</th>
                <th className="num">Raters</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a, i) => {
                const ok = isAbove(a);
                // In a single-year view the list is one clean cut, so mark the line.
                const showCut = singleYear && !ok && (i === 0 || isAbove(shown[i - 1]));
                return (
                  <Fragment key={a.id}>
                    {showCut && (
                      <tr className="cut-line">
                        <td colSpan={10}>Cutoff — {cutoffFor(yearFilter).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className={ok ? "above" : "below"}>
                      <td className="num">{i + 1}</td>
                      <td className="num">
                        {yearRank[a.id]} of {yearStats.find((y) => y.year === a.gradYear)?.total ?? "—"}
                      </td>
                      <td>
                        <Mugshot applicant={a} size={52} />
                      </td>
                      <td className="rank-name">
                        <Link href={`/grading?id=${a.id}`}>{a.fullName}</Link>
                        <Link className="app-link" href={`/grading?id=${a.id}`}>
                          application ↗
                        </Link>
                      </td>
                      <td>{ROLE_LABEL[a.roleCategory]}</td>
                      <td>{a.gradYear || "—"}</td>
                      <td className="num">
                        <strong>{a.score?.toFixed(2) ?? "—"}</strong>
                      </td>
                      <td className="num" style={{ color: "var(--muted)" }}>
                        {cutoffFor(a.gradYear).toFixed(2)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="tally"
                          title="Show the notes"
                          aria-expanded={openNotes === a.id}
                          onClick={() => setOpenNotes(openNotes === a.id ? null : a.id)}
                        >
                          {a.tally
                            .filter((t) => t.count > 0)
                            .map((t) => (
                              <span key={t.value} className="tally-bit">
                                {t.icon}
                                {t.count > 1 && <em>×{t.count}</em>}
                              </span>
                            ))}
                        </button>
                      </td>
                      <td className="num">{a.ratingCount}</td>
                    </tr>
                    {openNotes === a.id && (
                      <tr className="note-row">
                        <td colSpan={10}>
                          {a.ratings.map((r, n) => (
                            <div className="note-line" key={n}>
                              <span>{ratingMeta(r.value)?.icon}</span>
                              <strong>{r.graderName}</strong>
                              <span>{r.note || "No note."}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
