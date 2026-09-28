"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compareGradYears, gradYearParts, GRAD_YEAR_OPTIONS } from "@/lib/mapping";

const ROLE_LABEL = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Both",
  OTHER: "Other",
  UNKNOWN: "Not specified",
};
const ROLE_ORDER = ["DEVELOPER", "DESIGNER", "BOTH", "OTHER", "UNKNOWN"];

const STATUS_LABEL = { PASSED: "Passed", REJECTED: "Not passed", PENDING: "Undecided" };

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

const CRITERIA = [
  { key: "technical", label: "Tech" },
  { key: "thoughtfulness", label: "Thought" },
  { key: "initiative", label: "Init" },
  { key: "communityFit", label: "Comm" },
];

/**
 * Every grader's scores and what they wrote on the grading page, per
 * criterion. The thumbs notes from Mugshots belong to the interview round and
 * are read there instead.
 */
function Reviews({ applicant }) {
  const { reviews } = applicant;

  if (reviews.length === 0) {
    return <div className="note-line">Nobody has reviewed this applicant yet.</div>;
  }

  return (
    <>
      {reviews.map((g, n) => (
        <div className="note-group" key={n}>
          <div className="note-group-title">
            {g.autoDecision && (
              <span className={`dtag ${g.autoDecision.toLowerCase()}`}>
                {g.autoDecision === "ACCEPT" ? "auto accept" : "auto reject"}
              </span>
            )}
            {g.graderName} · {g.total}/{MAX_SCORE}
          </div>
          <div className="review-scores">
            {CRITERIA.map((c) => (
              <span key={c.key}>
                {c.label} <strong>{g.scores[c.key]}</strong>
              </span>
            ))}
          </div>
          {g.notes.map((note) => (
            <div className="note-line" key={note.label}>
              <span className="note-label">{note.label}</span>
              <span>{note.text}</span>
            </div>
          ))}
          {g.notes.length === 0 && g.autoDecision && (
            <div className="note-line">
              <span>No reason given.</span>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

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

/**
 * Turns the what-if cutoffs into a decision. Two steps, because it rewrites
 * the screening result for everyone on screen, and the second step says
 * exactly how many that is.
 */
function SaveResult({ shown, isAbove, counts, onSaved }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pass = shown.filter(isAbove).length;
  const fail = shown.length - pass;

  async function save() {
    setBusy(true);
    const res = await fetch("/api/screening", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: shown.map((a) => ({
          applicantId: a.id,
          status: isAbove(a) ? "PASSED" : "REJECTED",
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setAsking(false);
    setMsg(res.ok ? `Saved ${data.saved} results.` : data.error || "Could not save.");
    if (res.ok) onSaved();
  }

  return (
    <div className="save-result">
      <div className="bd-title">Screening result</div>
      <div className="save-result-counts">
        Saved so far: <strong>{counts.PASSED}</strong> passed ·{" "}
        <strong>{counts.REJECTED}</strong> not passed · <strong>{counts.PENDING}</strong> undecided
      </div>
      {!asking ? (
        <button
          className="btn primary"
          disabled={shown.length === 0}
          onClick={() => {
            setMsg("");
            setAsking(true);
          }}
        >
          Save these cutoffs as the result
        </button>
      ) : (
        <div className="confirm-box">
          <p>
            Mark <strong>{pass}</strong> passed and <strong>{fail}</strong> not passed? Only the{" "}
            {shown.length} graded applicants shown with the current filters change. Anyone marked
            not passed leaves their group work cohort.
          </p>
          <div className="btn-row">
            <button className="btn" disabled={busy} onClick={() => setAsking(false)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Yes, save"}
            </button>
          </div>
        </div>
      )}
      <div className="save-note">{msg}</div>
    </div>
  );
}

/** One applicant's saved result; admins can change it in place. */
function StatusCell({ applicant, isAdmin, onSaved }) {
  const [busy, setBusy] = useState(false);
  const status = applicant.screeningStatus;
  if (!isAdmin) {
    return <span className={`status-tag ${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
  }
  return (
    <select
      className={`status-select ${status.toLowerCase()}`}
      value={status}
      disabled={busy}
      aria-label={`Screening result for ${applicant.fullName}`}
      onChange={async (e) => {
        setBusy(true);
        await fetch("/api/screening", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ applicantId: applicant.id, status: e.target.value }] }),
        });
        setBusy(false);
        onSaved();
      }}
    >
      {Object.entries(STATUS_LABEL).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export default function RankingsClient({ applicants, isAdmin }) {
  const router = useRouter();
  const [openNotes, setOpenNotes] = useState(null);
  const [minReviews, setMinReviews] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Every graduation year present, oldest first, each class immediately
  // followed by its junior transfers; Other/Unknown last.
  const allYears = useMemo(() => {
    const set = new Set(applicants.map((a) => a.gradYear));
    return [...set].sort(compareGradYears);
  }, [applicants]);

  // The filter offers every option the form asks about, even ones nobody has
  // submitted yet — otherwise a cohort with no applicants (a new transfer
  // intake, say) looks like it is missing from the app rather than empty.
  const filterYears = useMemo(() => {
    const set = new Set([...GRAD_YEAR_OPTIONS, ...allYears]);
    return [...set].sort(compareGradYears);
  }, [allYears]);

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
          // An overridden applicant is decided, so no further reviews are
          // wanted — don't hide them behind the minimum-reviews filter.
          (a.reviewCount >= minReviews || a.override) &&
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

  // An applicant clears the bar set for their own graduation year — unless a
  // grader has overridden the decision, which wins over the score.
  const isAbove = (a) => {
    if (a.override === "ACCEPT") return true;
    if (a.override === "REJECT") return false;
    return a.average >= cutoffFor(a.gradYear);
  };
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

  const statusCounts = { PASSED: 0, REJECTED: 0, PENDING: 0 };
  for (const a of applicants) statusCounts[a.screeningStatus]++;

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
            {filterYears.map((y) => (
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
        <div className={`cutoff-grid${singleYear ? " two-up" : ""}`}>
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
          {/* The year breakdown is a single trivial row when one year is selected. */}
          {!singleYear && (
            <Breakdown
              title="Above cutoff by graduation year"
              rows={yearRows}
              total={above.length}
            />
          )}
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

        {isAdmin && (
          <SaveResult
            shown={graded}
            isAbove={isAbove}
            counts={statusCounts}
            onSaved={() => router.refresh()}
          />
        )}
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
                <th className="num">Notes</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {graded.map((a, i) => {
                const ok = isAbove(a);
                // In a single-year view the list is one clean cut, so mark the line.
                const showCut =
                  singleYear && !ok && (i === 0 || isAbove(graded[i - 1]));
                const cols = singleYear ? 12 : 13;
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
                        {a.override && (
                          <button
                            type="button"
                            className={`dtag ${a.override.toLowerCase()} clickable`}
                            aria-expanded={openNotes === a.id}
                            title="Show why"
                            onClick={() =>
                              setOpenNotes(openNotes === a.id ? null : a.id)
                            }
                          >
                            {a.override === "ACCEPT"
                              ? "auto accept"
                              : a.override === "REJECT"
                              ? "auto reject"
                              : "conflict"}
                          </button>
                        )}
                      </td>
                      <td>{ROLE_LABEL[a.roleCategory]}</td>
                      <td>{a.gradYear}</td>
                      <td className="num">
                        <strong className={a.override && a.override !== "CONFLICT" ? "overridden" : ""}>
                          {a.average.toFixed(2)}
                        </strong>
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
                      <td className="num">
                        <button
                          type="button"
                          className="note-btn"
                          aria-expanded={openNotes === a.id}
                          title="See each grader's scores"
                          onClick={() => setOpenNotes(openNotes === a.id ? null : a.id)}
                        >
                          {a.reviewCount} {openNotes === a.id ? "▴" : "▾"}
                        </button>
                      </td>
                      <td className="num">
                        <button
                          type="button"
                          className="note-btn"
                          disabled={a.noteCount === 0}
                          aria-expanded={openNotes === a.id}
                          title={
                            a.noteCount === 0
                              ? "Nobody has written anything yet"
                              : "Read what the graders wrote"
                          }
                          onClick={() => setOpenNotes(openNotes === a.id ? null : a.id)}
                        >
                          {a.noteCount === 0 ? "—" : `💬 ${a.noteCount}`}
                        </button>
                      </td>
                      <td>
                        <StatusCell
                          applicant={a}
                          isAdmin={isAdmin}
                          onSaved={() => router.refresh()}
                        />
                      </td>
                    </tr>
                    {openNotes === a.id && (
                      <tr className="note-row">
                        <td colSpan={cols}>
                          <Reviews applicant={a} />
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
