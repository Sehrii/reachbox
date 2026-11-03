# ReachBox: Email Scheduler + Dashboard

A small email scheduling service with a dashboard. You schedule a list of emails, and they go out at the right time through Ethereal SMTP, respecting the throttling and hourly limits. Emails survive restarts and are never sent twice. When a limit is hit, you get a Slack alert.

| | |
|---|---|
| **Backend** | TypeScript · Express 5 · BullMQ (Redis) · PostgreSQL (Prisma) · Nodemailer → Ethereal · Elasticsearch · Bull Board |
| **Frontend** | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TanStack Query · TypeScript |
| **Auth / Integrations** | Google OAuth 2.0 (real), Slack OAuth v2 (`incoming-webhook`) |

**There is no cron anywhere.** Every send is a BullMQ delayed job.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Running locally](#running-locally)
4. [Configuration](#configuration)
5. [Setting up Google and Slack](#setting-up-google-and-slack)
6. [How scheduling works](#how-scheduling-works)
7. [Persistence, restarts and idempotency](#persistence-restarts-and-idempotency)
8. [Rate limiting and throttling](#rate-limiting-and-throttling)
9. [Behaviour under load](#behaviour-under-load)
10. [Search](#search)
11. [API reference](#api-reference)
12. [Project structure](#project-structure)
13. [Trade-offs and known limitations](#trade-offs-and-known-limitations)

---

## Features

**Backend**
- `POST /api/emails/schedule` stores a campaign and one row per recipient in Postgres, then creates one **BullMQ delayed job** per email.
- Emails rotate across **multiple Ethereal sender accounts**, which are created automatically on first boot. A campaign can also be pinned to one sender.
- **Configurable worker concurrency**, a **minimum gap between sends** per sender, and **hourly limits per sender and per campaign**. All of them are enforced with Redis, so they hold across any number of workers.
- When an hourly limit is reached, jobs **move to the next hour in order**. They are never dropped or failed.
- A **Slack alert** goes to the user's own Slack when a limit is hit. It is connected through a real OAuth flow and can be disconnected and reconnected at any time.
- **Restart-safe:** delayed jobs live in Redis with AOF persistence, and on boot the queue is reconciled against Postgres. Emails are **never sent twice**.
- **Elasticsearch** indexing and search. If Elasticsearch is down, search falls back to Postgres.
- **Bull Board** live queue dashboard at `/admin/queues`.

**Frontend** (follows the provided Figma)
- Login page with **Google sign-in**. The header card shows your name, email and avatar, with a logout menu.
- **Scheduled** and **Sent** tabs with live counts, search, a status filter, refresh, loading skeletons, empty states and error states with retry.
- **Compose** page:
  - From (sender);
  - To, with email chips and **CSV/TXT upload** that shows the number of addresses detected;
  - subject, delay between emails, hourly limit;
  - a rich-text body;
  - a **Send Later** picker with presets;
  - a confirmation step that warns when the list exceeds the hourly limit.
- An email detail view: a sandboxed HTML preview, the status, a "View on Ethereal" link, and a note when a rate limit moved the email.
- Toasts for success and errors, plus Slack connect / test / disconnect from the user menu.

---

## Architecture

```
 ┌────────────────────┐      cookie session       ┌──────────────────────────────┐
 │  Next.js dashboard │ ────────────────────────▶ │  Express API (:4000)          │
 │  (:3000)           │ ◀──────────────────────── │  /auth  /api/emails  /api/slack│
 └────────────────────┘                           │  /admin/queues (Bull Board)    │
                                                  └──────┬───────────────┬────────┘
                                   1. INSERT rows        │               │ 2. addBulk delayed jobs
                                                         ▼               ▼    (jobId = emailId)
                                               ┌──────────────┐   ┌──────────────┐
                                               │ PostgreSQL   │   │ Redis (AOF)  │
                                               │ source of    │   │ BullMQ queue │
                                               │ truth        │   │ + rate keys  │
                                               └──────▲───────┘   └──────┬───────┘
                                                      │ claim / update   │ job due
                                                      │                  ▼
                                               ┌──────┴──────────────────────────┐
                                               │ Worker(s), concurrency N          │
                                               │ hourly slot → throttle → claim →  │──▶ Ethereal SMTP
                                               │ send → mark SENT                  │──▶ Slack webhook (limit hit)
                                               └───────────────────────────────────┘──▶ Elasticsearch (index)
```

The worker can run inside the API process (`RUN_WORKER_IN_API=true`, the default locally) or as any number of separate processes (`npm run worker`).

---

## Running locally

### Prerequisites
- Node.js 20+ (developed on Node 24)
- PostgreSQL 14+, Redis 6.2+, and optionally Elasticsearch 8. The easiest way to get all three is:
  ```bash
  docker compose up -d     # postgres:5432, redis:6379 (AOF on), elasticsearch:9200
  ```
  Hosted services work too. I developed against local Postgres and Redis Cloud.

### Backend
```bash
cd backend
cp .env.example .env          # set DATABASE_URL, REDIS_URL, JWT_SECRET, Google/Slack keys
npm install                   # also runs `prisma generate`
npx prisma migrate deploy     # create tables
npm run dev                   # API + worker on http://localhost:4000
```
On first boot the API creates 3 Ethereal sender accounts (`SENDER_COUNT`).

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

### Scaling out workers
```bash
# backend/.env: RUN_WORKER_IN_API=false
npm run dev          # terminal 1: API only
npm run dev:worker   # terminals 2..N: workers
```

### Useful URLs
| | |
|---|---|
| Dashboard | http://localhost:3000 |
| Queue dashboard (Bull Board) | http://localhost:4000/admin/queues |
| Health check | http://localhost:4000/health |

---

## Configuration

All values are read from `backend/.env` and validated at startup with zod. The process won't start with a bad config.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | – | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis for BullMQ, rate-limit counters and the throttle |
| `ELASTICSEARCH_URL` | *(empty)* | Empty turns ES off (search uses Postgres) |
| `JWT_SECRET` | – | Signs session cookies and the Slack OAuth `state` |
| `FRONTEND_URL` / `API_URL` | `:3000` / `:4000` | CORS, redirects, OAuth callbacks |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | – | Google OAuth |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_REDIRECT_URI` | – | Slack OAuth (redirect must be https) |
| `RUN_WORKER_IN_API` | `true` | Run the worker inside the API process |
| `WORKER_CONCURRENCY` | `5` | Parallel jobs per worker process |
| `MIN_DELAY_BETWEEN_SENDS_MS` | `2000` | **Minimum gap between two sends from the same sender** |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | **Hourly ceiling per sender** |
| `SENDER_COUNT` / `ETHEREAL_SENDERS` | `3` / *(empty)* | Auto-create N Ethereal accounts, or provide `user:pass,user:pass` |
| `ENABLE_DEV_LOGIN` | `false` | Allows `POST /auth/dev-login` for local testing. Never on in production |

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_ENABLE_DEV_LOGIN`, which makes the email/password form use the dev login.

---

## Setting up Google and Slack

### Google OAuth
1. Google Cloud Console: create a project, then **Google Auth Platform**. Set up the consent screen as **External** and add your Gmail under **Audience → Test users**.
2. **Clients → Create client → Web application**:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:4000/auth/google/callback`
3. Put the client ID and secret in `backend/.env`.

### Slack OAuth
Slack only redirects to **https**, so expose the API through a tunnel while developing:
```bash
cloudflared tunnel --url http://localhost:4000    # or: ngrok http 4000
```
1. https://api.slack.com/apps → **Create New App → From scratch**.
2. **OAuth & Permissions**:
   - Bot token scope: `incoming-webhook`
   - Redirect URL: `https://<tunnel>/api/slack/callback`
3. **Incoming Webhooks** → turn it on.
4. In `backend/.env`, set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_REDIRECT_URI=https://<tunnel>/api/slack/callback`.

Only the Slack callback goes through the tunnel. Everything else, including the session cookie, stays on `localhost`.

**Demo:** in the user menu, click **Connect Slack**, pick a channel, and authorize. Then schedule a few emails with **Hourly Limit = 1**. The moment the second one is deferred, a ⚠️ alert appears in that Slack channel.

---

## How scheduling works

1. **Schedule:** the API lower-cases and de-dupes the recipients. In **one transaction** it writes a `Campaign` and N `Email` rows:
   - email *i* gets `scheduledAt = startAt + i × delay`;
   - each email gets a sender, round-robin.
   The rows are inserted with `createMany` in chunks of 1000.
2. **Enqueue:** each row becomes a BullMQ **delayed job** with `jobId = email.id` and `delay = scheduledAt − now`, added with `addBulk` in chunks of 500.
3. **Process:** when a job comes due, the worker:
   1. loads the row and **exits unless its status is `SCHEDULED`**;
   2. takes an **hourly slot** atomically, or **defers** the job to the next hour;
   3. reserves the sender's next **throttle slot** and waits for it;
   4. **claims** the row with `UPDATE … SET status='SENDING' WHERE status='SCHEDULED'`. Only one worker can win;
   5. sends through Ethereal and marks the row `SENT`, storing the `messageId` and Ethereal `previewUrl`.
4. **Failures:** SMTP errors retry 3 times with exponential backoff (30s, 60s, …). After the final attempt the email is marked `FAILED` with the reason.

---

## Persistence, restarts and idempotency

| Concern | How it's handled |
|---|---|
| Server restarts | BullMQ stores each job's due time **in Redis**. After an API or worker restart, jobs fire at their original time; nothing restarts from scratch. |
| Redis restarts | Redis runs with **AOF** (`appendonly yes`, see `docker-compose.yml`) and `maxmemory-policy noeviction`. |
| Crash between the DB write and the Redis write, or a wiped Redis | On boot, `reconcileQueue()` re-adds every `SCHEDULED` row. Because `jobId = emailId`, jobs that already exist are left alone. |
| Duplicate sends | Three layers: unique `jobId`, the status check, and the atomic `SCHEDULED → SENDING` claim. A row can be claimed only once, even with many workers or re-added jobs. |
| Crash during the SMTP call | The row stays `SENDING`. On the next boot, rows that have been `SENDING` for more than 5 minutes are marked `FAILED` ("interrupted"), **not resent**. This is a deliberate **at-most-once** choice: for outreach, a missing email is better than a duplicate. A graceful shutdown (SIGTERM → `worker.close()`) waits for in-flight sends, so this only happens on hard kills. |

**Verified manually:** I scheduled emails 30 seconds out, killed the server with `taskkill /F`, and restarted it. Each email was sent exactly once, at its scheduled time.

---

## Rate limiting and throttling

All the state lives in **Redis** and is changed by **Lua scripts**, so the limits hold across any number of workers and machines. There are no in-memory counters.

### Minimum gap between sends: `MIN_DELAY_BETWEEN_SENDS_MS` (default **2 seconds, per sender**)
The key `throttle:sender:{id}` holds the next free send time for that sender. Each send atomically reserves `max(now, nextFree)` and pushes `nextFree` forward by the gap, then the worker waits until its reserved time. With 3 senders that is up to about 1.5 emails/s overall.

**Why not BullMQ's built-in `limiter`?** It is global rather than per sender. It also counts **every** job it processes, including the ones we only defer because of the hourly cap. With 800 deferred jobs and a 2s limiter, about 27 minutes of send capacity would go to jobs that do nothing. With the custom throttle, only real sends use up time.

The compose form's **"Delay between 2 emails"** is a separate, per-campaign spacing. It is applied when the emails are scheduled (`startAt + i × delay`).

### Emails per hour
There are two counters per fixed one-hour window. They are checked and incremented in a **single Lua script**, so two workers can never both take the last slot:

| Key | Limit |
|---|---|
| `rl:sender:{senderId}:{hourWindow}` | `MAX_EMAILS_PER_HOUR_PER_SENDER` (env) |
| `rl:campaign:{campaignId}:{hourWindow}` | the campaign's **Hourly Limit** from the compose form |

When either counter is full, the job is **not dropped or failed**:
- It goes back into BullMQ's delayed set via `job.moveToDelayed()` + `DelayedError`, which doesn't use up a retry attempt.
- Its new due time is **`nextHourStart + seq` ms**, where `seq` is the email's position in its campaign. A backlog therefore wakes up **in its original order**.
- The row's `scheduledAt` is updated and `rescheduleCount` incremented, so the dashboard always shows when the email will really go out.

### Slack alert
The first time a sender or a campaign is denied in a given hour window, the worker posts to that user's Slack webhook. A Redis `SET NX` key limits this to **one alert per window**, not one per deferred job.

The webhook is read from the database on every alert:
- not connected → no alert and no error;
- connected later → alerts start right away, without a redeploy;
- Slack returns 404/410 (app removed) → the stored connection is deleted.

---

## Behaviour under load

**1000 emails scheduled for the same moment**, with the defaults (3 senders, 2s gap, 200/hour per sender):

1. Scheduling takes 1 `createMany` call and 2 `addBulk` calls.
2. Hour 1: each sender sends 200 emails, one every 2s, which takes about 7 minutes. The remaining ~133 per sender are each denied once and moved to the next hour, in order. The user gets **one Slack alert per sender**.
3. Hour 2: the backlog goes out from the top of the hour, in the original order.

- **Concurrency:** `WORKER_CONCURRENCY` jobs run in parallel in each worker. This is safe because of the atomic claim, the Lua counters and the throttle reservation. Adding processes adds SMTP parallelism without breaking any limit.
- **Deferred jobs are cheap:** each denial is one Redis script call plus one row update. It doesn't take a throttle slot or an SMTP connection.

---

## Search

Every email is indexed in Elasticsearch when it is scheduled, in an `emails` index with these fields:
- `recipient` (text + keyword)
- `subject`, `body`
- `status`, `senderEmail`, `userId`
- `scheduledAt`, `sentAt`

The document is updated when the email is sent, fails, or is rescheduled.

`GET /api/emails/search?q=` runs a `bool_prefix` multi-match, boosted on recipient and then subject, and filtered by `userId` (and by tab). Indexing is best-effort: if ES is unavailable, scheduling still works and search falls back to Postgres `ILIKE`. The dashboard's search bar uses this endpoint.

---

## API reference

All `/api/*` routes need the session cookie (or `Authorization: Bearer <jwt>`).

| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` → `/auth/google/callback` | Google OAuth; sets an httpOnly cookie and redirects to `/dashboard` |
| GET | `/auth/me` | `{ user: { id, name, email, avatarUrl }, slack }` |
| POST | `/auth/logout` | Clears the session |
| POST | `/api/emails/schedule` | `{ subject, body, recipients[], startAt, delayMs, hourlyLimit, senderId? }` → `{ campaignId, count, firstScheduledAt, lastScheduledAt }` |
| GET | `/api/emails/scheduled?page&pageSize` | Status `scheduled` / `sending`, earliest first |
| GET | `/api/emails/sent?page&pageSize` | Status `sent` / `failed`, newest first |
| GET | `/api/emails/search?q&kind` | Full-text search |
| GET | `/api/emails/stats` | `{ scheduled, sent, failed }` |
| GET | `/api/emails/:id` | One email |
| GET | `/api/senders` | Ethereal sender accounts |
| GET | `/api/slack/connect` → `/api/slack/callback` | Slack OAuth |
| GET | `/api/slack/status` | `{ connected, teamName, channel }` |
| POST | `/api/slack/test` | Sends a test message |
| DELETE | `/api/slack` | Disconnects |

Validation errors return `400 { error, details: { field: [messages] } }`.

---

## Project structure

```
backend/
  prisma/schema.prisma          User, SlackConnection, Sender, Campaign, Email
  src/
    config/env.ts               typed, validated configuration
    lib/                        prisma, redis, elasticsearch, logger
    queue/
      emailQueue.ts             BullMQ queue + idempotent enqueue (jobId = emailId)
      rateLimiter.ts            Lua: hourly counters, per-sender throttle, alert de-dupe
      reconcile.ts              boot-time recovery
    workers/emailWorker.ts      the job processor
    services/                   emails, mailer (Ethereal), senders, search, slack
    routes/                     auth, emails, slack
    middleware/                 auth (cookie/JWT), error handling
    server.ts · worker.ts       API entry · standalone worker entry

frontend/src/
  app/                          /login, (app)/dashboard, (app)/dashboard/sent, (app)/compose, (app)/emails/[id]
  components/ui/                Button, IconButton, Input, Avatar, Badge, Popover, Menu, Modal, Skeleton, EmptyState, Spinner
  components/layout/            AuthGuard, Sidebar, UserMenu, PageHeader, SlackRedirectNotice
  components/emails/            EmailListView (shared by both tabs), EmailRow, StatusBadge, EmailDetail, EmailBody
  components/compose/           ComposeForm, RecipientInput, RichTextEditor, SendLaterPopover, SenderSelect, ScheduleConfirmModal
  hooks/                        useMe, useEmailList, useSlack, useStarred, …
  lib/                          typed API client, formatting, email extraction from CSV
  types/api.ts                  request/response types
```

---

## Trade-offs and known limitations

- **Fixed hourly windows.** These are simple and cheap, but allow a burst at the boundary (up to 2× the limit across two adjacent half-hours). A sliding window would fix that at the cost of a sorted set per key.
- **At-most-once on hard crashes mid-send.** This is deliberate; see the restarts section above.
- **Failed attempts count toward the hourly limit**, which matches how real providers count attempts.
- **Ethereal never delivers mail.** Use the "View on Ethereal" link to see each message.
- **Not built:** attachments and archive/delete. They appear in the Figma but aren't part of the spec, and there's no backend for them. Stars are kept per browser.
- **Bull Board is unauthenticated.** Fine locally; in production, put it behind auth.
