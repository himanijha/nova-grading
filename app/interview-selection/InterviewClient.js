"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { RATINGS, ratingMeta } from "@/lib/ratings";
import { compareGradYears, GRAD_YEAR_OPTIONS } from "@/lib/mapping";

const ROLE_LABEL = {
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  BOTH: "Both",
  OTHER: "Other",
  UNKNOWN: "Not specified",
};
const ROLE_ORDER = ["DEVELOPER", "DESIGNER", "BOTH", "OTHER", "UNKNOWN"];

export default function InterviewClient({ applicants }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [minRatings, setMinRatings] = useState(1);
  const [openNotes, setOpenNotes] = useState(null);

  const years = useMemo(() => {
    const set = new Set([
      ...GRAD_YEAR_OPTIONS,
      ...applicants.map((a) => a.gradYear).filter(Boolean),
    ]);
    return [...set].sort(compareGradYears);
  }, [applicants]);

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

  // How the room currently leans, counting each person's strongest support.
  const summary = RATINGS.map((r) => ({
    ...r,
    count: shown.filter((a) => a.tally.find((t) => t.value === r.value)?.count > 0).length,
  }));

  return (
    <div className="page wide">
      <h1>Interview selection</h1>
      <p className="sub">
        Ranked by the thumbs from Mugshots, not by application scores. Each
        person&apos;s number is the average of their ratings — double thumbs up
        is 3, thumbs up 2, maybe 1, thumbs down 0.
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
            <div className="bd-title">In the running</div>
            <div className="hero-num">{shown.length}</div>
            <div className="hero-sub">
              rated {minRatings === 1 ? "at least once" : `by ${minRatings}+ people`}.
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
      </section>

      <section className="card">
        <h3>Ranked by rating ({shown.length})</h3>
        {shown.length === 0 ? (
          <div className="empty">
            Nobody matches these filters yet. Rate people on the Mugshots page.
          </div>
        ) : (
          <table className="tbl rank-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th></th>
                <th>Name</th>
                <th>Role</th>
                <th>Grad year</th>
                <th className="num">Score</th>
                <th>Ratings</th>
                <th className="num">Raters</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a, i) => (
                <Fragment key={a.id}>
                  <tr>
                    <td className="num">{i + 1}</td>
                    <td>
                      {a.hasPhoto ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          className="mug-avatar"
                          style={{ width: 34, height: 34 }}
                          src={`/api/photo/${a.id}?v=${a.photoVersion}`}
                          alt={a.fullName}
                        />
                      ) : (
                        <span className="mug-avatar blank" style={{ width: 34, height: 34 }}>
                          {a.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
                        </span>
                      )}
                    </td>
                    <td className="rank-name">
                      <Link href={`/grading?id=${a.id}`}>{a.fullName}</Link>
                    </td>
                    <td>{ROLE_LABEL[a.roleCategory]}</td>
                    <td>{a.gradYear || "—"}</td>
                    <td className="num">
                      <strong>{a.score?.toFixed(2) ?? "—"}</strong>
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
                      <td colSpan={8}>
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
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
