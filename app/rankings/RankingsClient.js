"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";

const ROLE_LABEL = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Both",
  OTHER: "Other",
  UNKNOWN: "Not specified",
};
const ROLE_ORDER = ["DEVELOPER", "DESIGNER", "BOTH", "OTHER", "UNKNOWN"];

const MAX_SCORE = 20;
const DEFAULT_CUTOFF = 14;

/** Counts by key, rendered as a single-hue magnitude bar list. */
function Breakdown({ title, rows, total }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <div className="bd-title">{title}</div>
      {rows.length === 0 && (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Nobody above the cutoff.</div>
      )}
      {rows.map((r) => (
        <div className="bd-row" key={r.key} title={`${r.label}: ${r.count} of ${total}`}>
          <span className="bd-label">{r.label}</span>
          <span className="bd-track">
            <span className="bd-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="bd-val">
            <strong>{r.count}</strong>{" "}
            {total > 0 ? `· ${Math.round((r.count / total) * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One year's cutoff slider, with the count it currently admits. */
function YearCutoff({ year, cutoff, above, total, onChange }) {
  return (
    <div className="yc-row">
      <div className="yc-year">{year}</div>
      <div className="yc-slider">
        <input
          type="range"
          min={0}
          max={MAX_SCORE}
          step={0.25}
          value={cutoff}
          aria-label={`Cutoff score for ${year}`}
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

export default function RankingsClient({ applicants }) {
  const [minReviews, setMinReviews] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Every graduation year present, oldest first; unknowns last.
  const allYears = useMemo(() => {
    const set = new Set(applicants.map((a) => a.gradYear));
    return [...set].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1;
      if (!isNaN(nb)) return 1;
      return a.localeCompare(b);
    });
  }, [applicants]);

  // Each year carries its own cutoff, so you can admit a different number per class.
  const [cutoffs, setCutoffs] = useState(() =>
    Object.fromEntries(allYears.map((y) => [y, DEFAULT_CUTOFF]))
  );
  const cutoffFor = (year) => cutoffs[year] ?? DEFAULT_CUTOFF;
  const setCutoff = (year, value) => setCutoffs((c) => ({ ...c, [year]: value }));

  const graded = useMemo(
    () =>
      applicants.filter(
        (a) =>
          a.average !== null &&
          a.reviewCount >= minReviews &&
          (roleFilter === "all" || a.roleCategory === roleFilter) &&
          (yearFilter === "all" || a.gradYear === yearFilter)
      ),
    [applicants, minReviews, roleFilter, yearFilter]
  );

  const ungradedCount = applicants.filter(
    (a) =>
      a.average === null &&
      (roleFilter === "all" || a.roleCategory === roleFilter) &&
      (yearFilter === "all" || a.gradYear === yearFilter)
  ).length;

  // An applicant clears the bar set for their own graduation year.
  const isAbove = (a) => a.average >= cutoffFor(a.gradYear);
  const above = graded.filter(isAbove);

  const visibleYears = yearFilter === "all" ? allYears : [yearFilter];

  const yearStats = visibleYears.map((y) => {
    const inYear = graded.filter((a) => a.gradYear === y);
    return {
      year: y,
      total: inYear.length,
      above: inYear.filter(isAbove).length,
    };
  });

  const roleRows = ROLE_ORDER.map((key) => ({
    key,
    label: ROLE_LABEL[key],
    count: above.filter((a) => a.roleCategory === key).length,
  })).filter((r) => r.count > 0 || ["DEVELOPER", "DESIGNER"].includes(r.key));

  const yearRows = yearStats
    .filter((y) => y.total > 0)
    .map((y) => ({ key: y.year, label: y.year, count: y.above }));

  const pct = graded.length ? Math.round((above.length / graded.length) * 100) : 0;
  const singleYear = yearFilter !== "all";

  return (
    <div className="page wide">
      <h1>Rankings</h1>
      <p className="sub">
        Applicants ranked by their average grader score out of {MAX_SCORE}. Each
        graduation year has its own cutoff, so you can admit a different number
        from each class.
      </p>

      <div className="toolbar">
        <div className="row-inline">
          <label htmlFor="yearf">Graduation year</label>
          <select
            id="yearf"
            className="inp"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All years</option>
            {allYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="row-inline">
          <label htmlFor="rolef">Role</label>
          <select
            id="rolef"
            className="inp"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="row-inline">
          <label htmlFor="minrev">At least</label>
          <select
            id="minrev"
            className="inp"
            value={minReviews}
            onChange={(e) => setMinReviews(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "review" : "reviews"}
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
              of {graded.length} graded {graded.length === 1 ? "applicant" : "applicants"} (
              {pct}%) clear the cutoff for their year.
              {ungradedCount > 0 && (
                <>
                  <br />
                  {ungradedCount} {ungradedCount === 1 ? "applicant has" : "applicants have"} no
                  reviews yet and {ungradedCount === 1 ? "is" : "are"} not counted.
                </>
              )}
            </div>
          </div>

          <Breakdown title="Above cutoff by role" rows={roleRows} total={above.length} />
          <Breakdown
            title="Above cutoff by graduation year"
            rows={yearRows}
            total={above.length}
          />
        </div>

        <div className="yc-block">
          <div className="bd-title">
            {singleYear ? "Cutoff for this year" : "Cutoff per graduation year"}
          </div>
          <div className="yc-head">
            <span />
            <span />
            <span className="yc-cut">Score</span>
            <span className="yc-count">Admitted</span>
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
              No graded applicants match these filters.
            </div>
          )}
          {!singleYear && (
            <button
              className="btn"
              style={{ marginTop: 12, padding: "7px 12px" }}
              onClick={() =>
                setCutoffs(Object.fromEntries(allYears.map((y) => [y, DEFAULT_CUTOFF])))
              }
            >
              Reset all to {DEFAULT_CUTOFF}
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h3>
          Ranked applicants ({graded.length})
          {singleYear ? ` — class of ${yearFilter}` : ""}
        </h3>
        {graded.length === 0 ? (
          <div className="empty">No graded applicants match these filters yet.</div>
        ) : (
          <table className="tbl rank-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Name</th>
                <th>Role</th>
                <th>Grad year</th>
                <th className="num">Average</th>
                {!singleYear && <th className="num">Year cutoff</th>}
                <th className="num">Tech</th>
                <th className="num">Thought</th>
                <th className="num">Init</th>
                <th className="num">Comm</th>
                <th className="num">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {graded.map((a, i) => {
                const ok = isAbove(a);
                // In a single-year view the list is one clean cut, so mark the line.
                const showCut =
                  singleYear && !ok && (i === 0 || isAbove(graded[i - 1]));
                const cols = singleYear ? 10 : 11;
                return (
                  <Fragment key={a.id}>
                    {showCut && (
                      <tr className="cut-line">
                        <td colSpan={cols}>
                          Cutoff — {cutoffFor(yearFilter).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className={ok ? "above" : "below"}>
                      <td className="num">{i + 1}</td>
                      <td className="rank-name">
                        <Link href={`/grading?id=${a.id}`}>{a.fullName}</Link>
                      </td>
                      <td>{ROLE_LABEL[a.roleCategory]}</td>
                      <td>{a.gradYear}</td>
                      <td className="num">
                        <strong>{a.average.toFixed(2)}</strong>
                      </td>
                      {!singleYear && (
                        <td className="num" style={{ color: "var(--muted)" }}>
                          {cutoffFor(a.gradYear).toFixed(2)}
                        </td>
                      )}
                      <td className="num">{a.criteria.technical.toFixed(1)}</td>
                      <td className="num">{a.criteria.thoughtfulness.toFixed(1)}</td>
                      <td className="num">{a.criteria.initiative.toFixed(1)}</td>
                      <td className="num">{a.criteria.communityFit.toFixed(1)}</td>
                      <td className="num">{a.reviewCount}</td>
                    </tr>
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
