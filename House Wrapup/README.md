# House Wrapup

A small shared checklist for clearing out the house before renting it. Items can be
added, renamed, ticked off (crossed out), deleted, and commented on. Three people —
**RG**, **Erum**, **Yousuf** — switch with the chip in the top right; comments are
attributed to whoever is selected. Data lives in Upstash Redis, so everyone with the
link sees the same list.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then paste your Upstash credentials
npm run dev
```

Open http://localhost:3000

## Environment variables

| Name | Where to find it |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash console → your database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | same page (use the read/write token) |

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel → **Add New → Project** → import the repo (framework auto-detects as Next.js).
3. Under **Environment Variables**, add `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` for Production, Preview, and Development.
4. Deploy, then send the URL to Erum and Yousuf.

Alternatively, from the CLI:

```bash
npx vercel
npx vercel env add UPSTASH_REDIS_REST_URL
npx vercel env add UPSTASH_REDIS_REST_TOKEN
npx vercel --prod
```

> Tip: if you add the Upstash integration from the Vercel Marketplace, both variables
> are injected automatically.

## Usage notes

- **Add several at once** — paste multiple lines into the add box; each line becomes an item.
- **Edit** — click the ✎ icon or double-click the title. Enter saves, Escape cancels.
- **Comments** — 💬 opens the thread. The badge shows how many comments an item has.
- **Filters** — All / To do / Done / Has comments, plus a search box that also
  searches inside comments.
- The list refreshes every 6 seconds, so comments from others appear on their own.

## Data shape

Everything is stored under the single Redis key `house-wrapup:items:v1` as a JSON array:

```json
[
  {
    "id": "abc123",
    "title": "Grandfather clock in the hallway",
    "done": false,
    "createdBy": "RG",
    "createdAt": 1755500000000,
    "doneBy": null,
    "comments": [{ "id": "c1", "who": "Erum", "text": "Keep this one", "at": 1755500100000 }]
  }
]
```

There is no login — anyone with the URL can edit. Keep the link private.
