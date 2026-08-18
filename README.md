# House Wrapup

A shared checklist for clearing the house out before renting it. Everyone with the
link can do everything — add, rename, tick off, delete, comment. There is no login
and no "who am I" setting.

Each task carries a name tag: **Unassigned → RG → Erum → Yousuf**. Tap the tag to
flip it. The tabs across the top (All / Unassigned / RG / Erum / Yousuf) filter the
list, so anyone can open their own tab and see only what is theirs.

## Setup

```bash
npm install
cp .env.local.example .env.local   # paste your Upstash credentials
npm run dev
```

| Variable | Where to find it |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash console → your database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | same page (read/write token) |

On Vercel these two go in **Settings → Environment Variables** (Production).

## Deploy notes

- The project files must sit at the **root of the repo**. A folder name containing a
  space (like `House Wrapup/`) breaks Vercel's function naming.
- Framework Preset must be **Next.js**.

## The starter list

`lib/seed.js` holds the 52 opening tasks. They are written into Redis once, the first
time the app loads with an empty list, and a flag (`house-wrapup:seeded:v1`) stops it
ever happening again. Editing `seed.js` afterwards changes nothing — edit tasks in the
app instead.

To force a fresh reseed, delete both `house-wrapup:items:v1` and
`house-wrapup:seeded:v1` from the Upstash data browser.

## Usage

- **Add several at once** — paste multiple lines into the add box, one task per line.
  Adding while inside someone's tab assigns the new tasks to them.
- **Edit** — ✎ or double-click the title. Enter saves, Escape cancels.
- **Reassign** — tap the name tag on the right of any task to cycle it.
- **Comments** — 💬 opens the thread. The badge shows the count.
- **Search** — looks inside task titles *and* comments.
- The list refreshes every 6 seconds, so other people's changes appear on their own.

## Data shape

Everything lives under one Redis key, `house-wrapup:items:v1`:

```json
[
  {
    "id": "abc123",
    "title": "Dining table to the garage",
    "done": false,
    "assignee": "Yousuf",
    "createdAt": 1755500000000,
    "comments": [{ "id": "c1", "text": "Needs two people", "at": 1755500100000 }]
  }
]
```

No login — anyone with the URL can edit. Keep the link private.
