# Nova Application Grading

A grading platform for the Nova for Good club application. Import the Google
Form CSV, then grade applicants against a four-part rubric.

## Quick start

You need **Node 18.18+** (20 or newer recommended) and **Docker** — Docker
Desktop, OrbStack, and Colima all work.

```bash
npm install
cp .env.example .env         # the defaults work as-is for local development
docker compose up -d         # starts Postgres on port 55432
npx prisma migrate deploy    # creates the tables
npm run seed:demo            # loads 24 fake applicants and 3 fake graders
npm run dev                  # http://localhost:3000
```

Open http://localhost:3000 and sign in as any demo grader:

| Email           | Password      |
| --------------- | ------------- |
| `rae@nova.demo` | `password123` |
| `sam@nova.demo` | `password123` |
| `tia@nova.demo` | `password123` |

Demo graders are not admins. To see the Admin page, make yourself an account
(the password must be at least 8 characters):

```bash
npm run seed -- "Your Name" you@ucla.edu your-password
```

Stop Postgres with `docker compose down` when you're done. Your data is kept in
a named volume; `docker compose down -v` deletes it.

## Everyday commands

```bash
npm run dev                    # development server
npm run build && npm start     # production build
npm run seed:demo -- 60        # a specific number of fake applicants
npm run seed:demo -- 24 wipe   # remove the previous demo data first
npm run seed:demo -- 0 wipe    # clear demo data without adding more
```

Demo applicants use `@demo.ucla.edu` emails and demo graders use `@nova.demo`,
so `wipe` only removes generated data and never touches real applications. The
written responses live in `scripts/demo-content.mjs`; edit that file to change
what graders see. A few applicants are left ungraded on purpose so the "no
reviews yet" states are visible.

`sample/sample-responses.csv` holds three fake applications in the real Google
Form export format, for testing the Import page itself.

If you change `prisma/schema.prisma`, run `npx prisma migrate dev --name what-changed`
to create a migration, then `npx prisma migrate deploy` to apply it elsewhere.

## Using it

**Import CSV** — export responses from the Google Form (File → Download → CSV)
and upload it on the Import page. Column headers are matched to fields
automatically; the mapping is shown so you can correct anything before
importing. Re-importing the same export updates existing applicants rather than
duplicating them (matched on email + submission timestamp).

**Rankings** — the first page in the nav. Applicants are ranked by the average
of their graders' total scores (out of 20), highest first; ties break toward the
applicant with more reviews. Applicants with no reviews yet are excluded and
counted separately.

Each graduation year has its own cutoff, since you'll usually admit a different
number from each class. The cutoff card lists one slider per year with the count
it currently admits ("4 of 6 · 67%"). An applicant is measured against the
cutoff for *their* year, and the headline count is the total across all years.
Cutoffs are a what-if tool, not a saved decision — a reload starts fresh at 14.

Three filters sit above: **graduation year**, **role**, and a **minimum review
count** so you can compare only applicants with enough coverage. The form's year
options include a junior-transfer choice ("2028 (junior transfer)"); transfers
stay a separate cohort throughout, with their own filter entry and cutoff
slider. Casing and punctuation variants are normalised on import, so re-exports
of the form group cleanly.

**Grading** — the left column lists applicants sorted by fewest reviews first,
so the least-covered applications rise to the top. You can also sort by most
reviews, most recent, or name, filter by role, and search by name, email, or
major.

The middle column shows basic information, the four essay responses, and the
resume embedded from its Google Drive link. For the embed to work, the Drive
folder holding the form uploads must be shared with your graders.

The right column is the rubric — four criteria scored 1–5 with an optional
comment each, plus overall notes. **Save & Next** saves and jumps to the next
applicant you haven't graded yet. Each grader has one grade per applicant;
saving again updates it.

**Mugshots** — attach a photo to an application by finding the applicant and
dropping an image on the page. Photos are stored in the database rather than on
disk, so they survive a redeploy and are included in a backup. Large images are
shrunk in the browser before upload; the cap is 6MB. On the same page, you can
record a verdict — double thumbs up, thumbs up, maybe, thumbs down — with a note
saying why. One verdict per grader per applicant.

**Interview selection** — ranks people by those verdicts and *ignores the
application scores entirely*. The number is the average across everyone who
rated them: double thumbs up is 3, thumbs up 2, maybe 1, thumbs down 0. An
average rather than a total, so someone three people loved is not buried by
someone six people shrugged at — the rater count sits alongside so thin evidence
stays visible. Click the thumbs in a row to read the notes.

**Admin** (admins only) — add or remove graders, see grading progress, and
generate password reset links.

## Passwords

Graders sign in with email and password. "Forgot your password?" generates a
one-hour, single-use reset link. No mail service is wired up, so the link is
shown directly to the requester on-screen; an admin can also generate a reset
link for any grader from the Admin page. To send these by email instead, add
your mail provider inside `app/api/forgot/route.js` where the link is currently
returned.

This matters once the app is deployed: a locked-out grader has no self-service
route and has to reach an admin. For a group that signs in twice a year, wiring
up a mail provider is worth it.

## Deploying

Graders should get a URL, not a checkout. **Vercel + Neon** is the path this
project is built for: photos live in the database rather than on disk, so there
is no file storage to provision.

### 1. Database

Create a project at **neon.com**. It gives you two connection strings — you need
both, and they are not interchangeable:

- the **pooled** one (`-pooler` in the hostname) → the app's `DATABASE_URL`
- the **direct** one → migrations only

Prisma opens a connection per serverless instance, so the app must use the
pooled string or a handful of simultaneous graders will exhaust the database's
connection limit. Migrations must use the direct string, because pgbouncer
cannot run them.

### 2. Create the tables and your admin account

From your laptop, pointed at production:

```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
DATABASE_URL="<direct-url>" npm run seed -- "Your Name" you@ucla.edu your-password
```

### 3. Deploy

Push to GitHub, import the repo at **vercel.com**, and set two environment
variables:

| Variable         | Value                                        |
| ---------------- | -------------------------------------------- |
| `DATABASE_URL`   | the **pooled** Neon string                    |
| `SESSION_SECRET` | 32+ random characters (command below)         |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`SESSION_SECRET` signs the login cookies. The development fallback is public —
it is in this repository — so anyone who knows it could forge a session for any
grader, including an admin. The app refuses to serve requests in production if
the variable is missing or still the example value; it does not fall back.

Vercel builds with `prisma generate && next build` from `package.json`. Nothing
else needs configuring.

### 4. Before handing out the URL

- **Share the Drive folder** holding the form's resume uploads with every
  grader's Google account, or the resume pane in the grading view is blank for
  them.
- **Add your graders** from the Admin page, and send each the reset link it
  generates.

### Upload size

Vercel rejects request bodies over 4.5MB before they reach the app, so the photo
limit is 4MB (`lib/upload.js`). Photos the browser can decode are shrunk to
roughly 100–200KB first, so this only affects HEIC files straight off an iPhone,
which cannot be shrunk in the browser — those are rejected with a note to save
as JPEG.

## Backups

Applicant data is recoverable — it comes from the Google Form, so re-importing
the CSV rebuilds it. **The grades are the only irreplaceable thing here**, so
they are what these scripts protect.

```bash
npm run import backups/export-....json                 # load a dump
npm run import backups/export-....json --grades-only
```

Grades are stored in the dump by grader email + applicant key rather than by row
id, so they reattach correctly even if the applicants were recreated by
re-importing the Form CSV. Both scripts upsert, so re-running them is safe.

`scripts/export-data.mjs` reads a SQLite file directly and exists for the
one-time move off SQLite. For ongoing backups on a hosted database, use the
provider's own snapshots.

## Layout

- `prisma/schema.prisma` — Grader, Applicant, Grade, PasswordResetToken
- `prisma/migrations/` — schema history; apply with `prisma migrate deploy`
- `lib/mapping.js` — CSV header matching, role categorising, Drive URL handling
- `app/rankings/` — the ranking + cutoff screen
- `app/grading/` — the grading screen
- `app/import/` — CSV upload and column mapping
- `app/admin/` — grader management
- `scripts/` — seeding, backup / restore
