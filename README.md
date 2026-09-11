# Nova Application Grading

A grading platform for the Nova for Good club application. Import the Google
Form CSV, then grade applicants against a four-part rubric.

## Setup

```bash
npm install
npx prisma db push                                  # create the SQLite database
npm run seed -- "Your Name" you@ucla.edu yourpass    # create the first admin
npm run dev                                          # http://localhost:3000
```

Edit `.env` before deploying anywhere real — `SESSION_SECRET` must be a long
random string, and `DATABASE_URL` points at the SQLite file.

## Using it

**Import CSV** — export responses from the Google Form (File → Download → CSV)
and upload it on the Import page. Column headers are matched to fields
automatically; the mapping is shown so you can correct anything before
importing. Re-importing the same export updates existing applicants rather than
duplicating them (matched on email + submission timestamp).

**Graduation year** — the form's year options include a junior-transfer choice
("2028 (junior transfer)"). Transfers stay a separate cohort throughout: they
get their own entry in the year filter and their own cutoff slider on Rankings,
rather than being counted as part of that year's class. Casing and punctuation
variants of the answer are normalised on import, so re-exports of the form
group cleanly.

**Grading** — the left column lists applicants sorted by fewest reviews first,
so the least-covered applications rise to the top. You can also sort by most
reviews, most recent, or name, filter to Developers / Designers / Both, and
search by name, email, or major.

The middle column shows basic information, the four essay responses, and the
resume embedded from its Google Drive link. For the embed to work, the Drive
folder holding the form uploads must be shared with your graders.

The right column is the rubric — four criteria scored 1–5 with an optional
comment each, plus overall notes. **Save & Next** saves and jumps to the next
applicant in the list you haven't graded yet. Underneath, "Graded by" lists
every grader who has already scored this application and their scores.

Each grader has one grade per applicant; saving again updates it.

**Admin** (admins only) — add or remove graders, see grading progress, and
generate password reset links.

## Passwords

Graders sign in with email and password. "Forgot your password?" generates a
one-hour, single-use reset link. No mail service is wired up, so the link is
shown directly to the requester on-screen; an admin can also generate a reset
link for any grader from the Admin page and pass it along. To send these by
email instead, add your mail provider inside `app/api/forgot/route.js` where
the link is currently returned.

## Layout

- `prisma/schema.prisma` — Grader, Applicant, Grade, PasswordResetToken
- `lib/mapping.js` — CSV header matching, role categorising, Drive URL handling
- `app/grading/` — the grading screen
- `app/import/` — CSV upload and column mapping
- `app/admin/` — grader management
- `sample/sample-responses.csv` — eight fake applications for trying it out
