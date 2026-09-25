import Link from "next/link";
import { formatWhen } from "@/lib/when";

/** One step of the season: a number, what it is, how far along, where to do it. */
function Step({ n, title, done, children, href, action }) {
  return (
    <div className={`step${done ? " done" : ""}`}>
      <div className="step-num">{done ? "✓" : n}</div>
      <div className="step-body">
        <div className="step-title">{title}</div>
        <div className="step-status">{children}</div>
      </div>
      {href && (
        <Link href={href} className="btn sm step-go">
          {action}
        </Link>
      )}
    </div>
  );
}

function Bar({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className="mini-bar" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * The whole group work stage on one page, in the order it happens. Planning
 * steps first (admins), then one card per cohort for the day itself.
 */
export default function EventClient({ isAdmin, screening, graded, unassigned, cohorts }) {
  const passed = screening.PASSED;
  const inCohorts = passed - unassigned;

  return (
    <div className="page event">
      <h1>Group work</h1>
      <p className="sub">
        Screening → sign-ups → groups → mugshots → notes in your group → ratings →
        coffee chats.
      </p>

      <section className="card">
        <h3>Before the event</h3>
        <Step
          n={1}
          title="Save who passed screening"
          done={passed > 0}
          href="/rankings"
          action={isAdmin ? "Rankings" : "View"}
        >
          {passed > 0 ? (
            <>
              <strong>{passed}</strong> passed · {screening.REJECTED} not passed ·{" "}
              {screening.PENDING} undecided
            </>
          ) : (
            <>
              {graded} applications graded. Set the cutoffs on Rankings and save them as the
              result.
            </>
          )}
        </Step>
        <Step
          n={2}
          title="Put everyone who passed in a time slot"
          done={passed > 0 && cohorts.length > 0 && unassigned === 0}
          href={isAdmin ? "/cohorts" : null}
          action="Cohorts"
        >
          {cohorts.length === 0 ? (
            "No cohorts yet. Add the time slots, then upload the availability form."
          ) : (
            <>
              <strong>{inCohorts}</strong> of {passed} in a cohort
              {unassigned > 0 && <span className="warn-text"> · {unassigned} without one</span>}
              <Bar value={inCohorts} total={passed} />
            </>
          )}
        </Step>
        <Step
          n={3}
          title="Plan the groups and send schedules"
          done={cohorts.length > 0 && cohorts.every((c) => c.rounds > 0 && c.groupsWithGrader === c.groups)}
          href="/groups"
          action="Groups"
        >
          {cohorts.length === 0
            ? "Once cohorts exist, split each into symbol groups and plan the rounds."
            : cohorts
                .map((c) =>
                  c.rounds
                    ? `${c.name}: ${c.groups} groups, ${c.rounds} rounds${
                        c.groupsWithGrader < c.groups ? `, ${c.groups - c.groupsWithGrader} without a grader` : ""
                      }`
                    : `${c.name}: not planned`
                )
                .join(" · ")}
        </Step>
      </section>

      {cohorts.map((c) => {
        const q = `?cohort=${c.id}`;
        return (
          <section className="card" key={c.id}>
            <h3>
              {c.name} <span className="muted small">· {formatWhen(c.startsAt)}</span>
            </h3>
            <Step
              n={4}
              title="Mugshots: check in and photograph everyone"
              done={c.memberCount > 0 && c.photos === c.memberCount}
              href={`/mugshots${q}`}
              action="Mugshots"
            >
              <strong>{c.arrived}</strong> of {c.memberCount} arrived · <strong>{c.photos}</strong>{" "}
              photos
              <Bar value={c.photos} total={c.memberCount} />
            </Step>
            <Step n={5} title="Take notes in your group" href={`/my-group${q}`} action="My group">
              {c.myGroups.length ? (
                <>
                  You&apos;re at <strong>{c.myGroups.join(", ")}</strong> · {c.notes} notes written
                  so far
                </>
              ) : (
                <>You&apos;re not at a group in this cohort · {c.notes} notes written so far</>
              )}
            </Step>
            <Step
              n={6}
              title="Rate everyone you watched"
              done={c.watched > 0 && c.watchedRated === c.watched}
              href={`/rate${q}`}
              action="Rate"
            >
              {c.watched ? (
                <>
                  You&apos;ve rated <strong>{c.watchedRated}</strong> of the {c.watched} you watched ·{" "}
                </>
              ) : null}
              {c.rated} of {c.memberCount} have a rating
              <Bar value={c.watched ? c.watchedRated : c.rated} total={c.watched || c.memberCount} />
            </Step>
          </section>
        );
      })}

      <section className="card">
        <h3>After the event</h3>
        <Step n={7} title="Pick who gets a coffee chat" href="/interview-selection" action="Candidates">
          Ranked by everyone&apos;s thumbs from Rate, with the group work notes alongside.
        </Step>
      </section>
    </div>
  );
}
