# Group work event — design

## Goal

Carry applicants from written screening through the in-person group work event,
so graders know who is where, who has watched whom, and what they thought.

Season flow:

1. **Initial screening** — Grading and Rankings (exists). Output: a saved pass list.
2. **Group work event** — passed applicants pick a time slot (cohort, ~1 hour,
   ~100 people, one room). Photos are taken on a phone at check-in. The hour
   has several rounds; each round splits the room into small groups named by a
   colour + shape ("Blue Star"). Graders sit at one symbol for the whole hour,
   write notes on the people in front of them, and give a thumbs rating once
   the event is over.
3. **Coffee chats** (2 graders on 1 applicant) — for people who pass group work.
   Chosen with the existing Interview candidates page. Pairing is out of scope
   here.

Only graders use the app. Group assignments are planned ahead in the portal and
told to applicants by email or at check-in.

## Data model

- `Applicant.screeningStatus` — `PENDING | PASSED | REJECTED`.
- `Cohort` — name, optional start time, optional capacity.
- `CohortMember` — applicant → cohort (one cohort per applicant), `checkedInAt`.
- `Group` — cohort's symbol group: index, colour, shape. Fixed for the hour.
- `GroupGrader` — grader → group. Graders stay at one symbol for the whole
  hour; if that changes, add `roundId` here.
- `Round` — numbered round of a cohort.
- `Placement` — applicant → group within a round (one per applicant per round).
- `Note` — grader's observation about an applicant, stamped with round and
  group when written during the event.

Existing `ApplicantPhoto` is the check-in photo; existing `Rating` is the final
thumbs verdict after the event.

## Screens

| Screen | Who | Device | Purpose |
|---|---|---|---|
| Rankings | admin | desktop | "Save passes": everyone shown above their year's cutoff → PASSED, below → REJECTED; per-row override |
| Cohorts | admin | desktop | create slots; upload availability CSV → auto-assign → review → confirm; manual moves; export schedules CSV |
| Groups | admin edits, graders view | desktop | set group count, assign graders, generate rounds, move people between groups per round |
| Check-in | graders | phone | pick cohort, search, tap, take photo, mark arrived, see schedule |
| My group | graders | phone | this round's symbol, faces, quick notes per person |
| Rate | graders | phone/desktop | everyone you watched, all notes, thumbs rating |

## Algorithms (lib/grouping.js, pure)

- **Cohort matching:** people with the fewest available slots go first; each
  goes to the least-full available slot (by fill ratio when capacities are
  set); capacity is a hard limit; leftovers are reported.
- **Round generation:** greedy per round over a shuffled list; each person goes
  to the group minimising (people already met there × 10 + been at this symbol
  before × 3), then smallest size; group size capped at ceil(n / groups).

## Rules

- Only admins change status, cohorts, groups and placements. Any grader can
  check people in, take photos, write notes and rate.
- Moving someone to another cohort, or un-passing them, deletes their
  placements in the old cohort.
- Removing a group leaves its members unplaced for that round (shown in an
  "Unplaced" column) rather than silently re-shuffling.
- Notes are attributed to the signed-in grader server-side; the client never
  sends a grader id. Graders edit and delete only their own notes.
