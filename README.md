# Trakker

A light, Notion-flavoured tracker for auditing an existing web app. Make a page
per area you're reviewing (Homepage, Projects page, Checkout…), then log what
you find: screenshots, how bad it is, how much work it looks like, and notes.

Anyone with the link can edit. The whole app sits behind one shared password.

## Features

- **Pages** — group issues by area; rename inline, pick an icon, drag to reorder.
- **Issues** — title, description, **priority** (low / medium / high / critical),
  **effort** (trivial / small / medium / large) and **status** (open / in
  progress / done).
- **Screenshots** — paste from the clipboard (⌘V), drag and drop, or browse.
  Several per issue, reorderable, click to view full size. Stored in a
  **private** Blob store and served only to signed-in viewers.
- **List and board views** — drag to reorder in list view; in board view drag
  cards between columns to change status or priority.
- **Filter and sort** — by priority and status; manual order, priority, or newest.
- **One shared password** — remembered in a cookie for 400 days.

## Setup

You need a Neon database and a Vercel Blob store; both have free tiers.

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run db:push              # creates the tables
npm run dev
```

### Environment variables

| Variable                | Where it comes from                                            |
| ----------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | Neon → your project → the **pooled** connection string          |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → create a **private** Blob store → `vercel env pull` |
| `TRAKKER_PASSWORD`      | The shared password. Set to `form999`.                          |
| `AUTH_SECRET`           | `openssl rand -hex 32`. Changing it signs everyone out.         |

## Deploying

```bash
vercel link
vercel env pull .env.local     # brings down BLOB_READ_WRITE_TOKEN
# add DATABASE_URL, TRAKKER_PASSWORD and AUTH_SECRET in the Vercel dashboard
vercel --prod
```

Run `npm run db:push` once against the production database before first use.

Create the Blob store from the project's **Storage** tab; Vercel then injects
`BLOB_READ_WRITE_TOKEN` itself. Choose **private** access — the app expects it,
and it keeps screenshots behind the password. Redeploy afterwards, since
environment variables only reach new deployments.

## How it fits together

- **Next.js 16 App Router**, React 19, Tailwind v4.
- **`src/proxy.ts`** — Next 16's replacement for middleware. An optimistic gate
  that redirects browsers without a valid session cookie to `/login`.
- **`src/lib/session.ts`** — the real enforcement. Every Server Action calls
  `assertSession()`, because actions are reachable by direct `POST` and a proxy
  check alone would not be a security boundary.
- **`src/lib/auth.ts`** — the session cookie is an HMAC of a fixed subject, so
  it can't be forged by hand the way an `authed=true` flag could.
- **`src/lib/actions.ts`** — all mutations. Deleting an issue or page also
  deletes its blobs, so storage doesn't leak.
- **`src/db/`** — Drizzle schema and a lazily-created Neon client. The
  `neon-http` driver has **no interactive transactions**, so multi-row writes go
  through `db.batch([...])`, which Neon runs atomically.
- **Uploads** post to `/api/images/upload`, which stores the file with
  `put()`. The SDK's client-side `upload()` is not usable from a browser: it
  PUTs to `vercel.com/api/blob`, which sends no `Access-Control-Allow-Origin`
  header, so the request is blocked by CORS. To stay inside Vercel's 4.5 MB
  request-body limit, `src/lib/images.ts` shrinks oversized screenshots on the
  client first (max 2400px, WebP) and leaves smaller ones untouched.
- **Serving images**: the Blob store is **private**, so its URLs return 403 to
  anyone. `/api/images/[id]` checks the session, looks the blob URL up in the
  database by row id, and streams it back. Screenshots therefore sit behind the
  same password as the rest of the app. The id lookup also means the route
  can't be pointed at an arbitrary host.
- **Storage hygiene**: an image uploaded and then removed before saving is
  deleted from Blob, and deleting an issue or page deletes its files too.

## Scripts

| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Dev server on port 3000             |
| `npm run build`   | Production build                    |
| `npm run lint`    | ESLint                              |
| `npm run db:push` | Push the schema to the database     |
| `npm run db:studio` | Browse the data in Drizzle Studio |
