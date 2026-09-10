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
  Several per issue, reorderable, click to view full size.
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
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → create a Blob store → `vercel env pull`      |
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
- **Uploads** go straight from the browser to Blob storage; the app only signs a
  short-lived token at `/api/blob/upload`. Screenshots routinely exceed the
  4.5 MB serverless request-body limit, which is why they don't pass through
  the server.

## Scripts

| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Dev server on port 3000             |
| `npm run build`   | Production build                    |
| `npm run lint`    | ESLint                              |
| `npm run db:push` | Push the schema to the database     |
| `npm run db:studio` | Browse the data in Drizzle Studio |
