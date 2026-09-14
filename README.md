# Nova Application Grading

A grading platform for the Nova for Good club application. Import the Google
Form CSV, then grade applicants against a four-part rubric.

## Setup

The app runs on **PostgreSQL**. You need a database before anything else — pick
one of the two options below, then continue to "Then, in both cases".

### Option A — a hosted database (what you want for real use)

Free tiers are enough for this; a full application cycle is a few megabytes.

1. Make an account at **neon.com** (or supabase.com) and create a project.
   Pick the region closest to campus.
2. Copy the **connection string** it shows you. It looks like:
   `postgresql://user:password@ep-something.us-west-2.aws.neon.tech/neondb?sslmode=require`
3. Put it in `.env` as `DATABASE_URL` (see `.env.example`). Keep `?sslmode=require`.

Do not commit `.env` — it is already in `.gitignore`.

### Option B — Postgres on your laptop (for development)

Requires Docker Desktop:

```bash
docker compose up -d      # starts Postgres on port 55432
```

The default `DATABASE_URL` in `.env.example` already points at it.

### Then, in both cases

```bash
npm install
cp .env.example .env                                # then paste your DATABASE_URL
npx prisma migrate deploy                           # create the tables
npm run seed -- "Your Name" you@ucla.edu yourpass    # create the first admin
npm run dev                                          # http://localhost:3000
```

Also set `SESSION_SECRET` in `.env` to a long random string before deploying:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If you change `prisma/schema.prisma`, run `npx prisma migrate dev --name what-changed`
to create a migration, and `npx prisma migrate deploy` to apply it elsewhere.

## Backups and moving data

Applicant data is recoverable — it comes from the Google Form, so re-importing
the CSV rebuilds it. **The grades are the only irreplaceable thing here**, so
they are what these scripts protect.

```bash
node scripts/export-data.mjs                    # dump a SQLite database to backups/*.json
npm run import backups/export-....json          # load a dump into the current database
npm run import backups/export-....json --grades-only
```

Grades are stored in the dump by grader email + applicant key rather than by row
id, so they reattach correctly even if the applicants were recreated by
re-importing the Form CSV. Both scripts upsert, so re-running them is safe.

The export reads a SQLite file directly and exists mainly for the one-time move
off SQLite. For ongoing backups on a hosted database, use the provider's own
snapshots — that is most of why you are paying them.

## Trying it with fake data

```bash
npm run seed:demo              # 24 fake applicants, 3 fake graders, random grades
npm run seed:demo -- 60        # a specific number of applicants
npm run seed:demo -- 24 wipe   # remove the previous demo data first
```

Demo applicants use `@demo.ucla.edu` emails and demo graders use `@nova.demo`,
so `wipe` only removes generated data and never touches real applications.

The written responses come from `scripts/demo-content.mjs` — eight full fake
applications at varying quality, tagged with a strength the seeder uses to
cluster the generated grades. That means the Rankings page shows a believable
spread rather than noise: the applications that read well actually rank high.
Edit that file to change what graders see. A few applicants are left ungraded on
purpose so the "no reviews yet" states are visible. To clear the demo data without adding more:

```bash
npm run seed:demo -- 0 wipe
```

There is also `sample/sample-responses.csv` — three fake applications in the real
Google Form export format, for testing the Import page itself.

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
- `prisma/migrations/` — schema history; apply with `prisma migrate deploy`
- `scripts/export-data.mjs`, `scripts/import-data.mjs` — backup / restore
- `lib/mapping.js` — CSV header matching, role categorising, Drive URL handling
- `app/grading/` — the grading screen
- `app/import/` — CSV upload and column mapping
- `app/admin/` — grader management
- `sample/sample-responses.csv` — eight fake applications for trying it out
