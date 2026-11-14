# Render Deployment Guide

This guide walks you through deploying the Reachbox app to [Render](https://render.com).

## Prerequisites

1. **Create a Render account** at [render.com](https://render.com) (free tier available).
2. **Push your code to GitHub** — Render deploys from a Git repository.

   ```powershell
   # From your project root
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repo on GitHub, then:
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

---

## Step 1: Create PostgreSQL Database on Render

1. Go to **Dashboard** → **Create a new service** → **PostgreSQL** (choose "PostgreSQL", not "Web Service").
2. Name it `reachbox-postgres`.
3. Choose the **free plan** (750 MB limit, enough for this project).
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (looks like `postgresql://user:password@host:5432/dbname`). You'll need it for the backend.

---

## Step 2: Create Redis on Render

1. Go to **Dashboard** → **Create a new service** → **PostgreSQL** → select **Redis** instead.
   - If Redis isn't directly available, use the **Web Service** option and deploy a Redis image, or use [Upstash](https://upstash.com) (free tier) as an alternative.
2. Name it `reachbox-redis`.
3. Choose the **free plan**.
4. Click **Create**.
5. Once created, copy the **Redis URL** (looks like `redis://default:password@host:6379`). You'll need it for the backend.

**Alternative for Redis**: If Render Redis isn't available on your plan:
- Sign up at [Upstash](https://upstash.com) → Create a free Redis database → Copy the connection string.

---

## Step 3: Deploy the Backend

1. Go to **Dashboard** → **Create a new service** → **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `reachbox-backend`
   - **Root directory**: `backend`
   - **Build command**: `npm ci && npm run build`
   - **Start command**: `npm run db:deploy && npm start`
   - **Plan**: Free

   **Note on database migrations**: The start command runs `npm run db:deploy` (which executes `prisma migrate deploy`) before starting the server. This automatically applies any pending database migrations on every deploy, so you don't need to run migrations manually. On the first deploy, it will create all the required tables. On subsequent deploys, it will apply any new migrations if you've added them.

4. Set **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (Render assigns this, but set it explicitly) |
   | `DATABASE_URL` | *(paste the PostgreSQL URL from Step 1)* |
   | `REDIS_URL` | *(paste the Redis URL from Step 2)* |
   | `JWT_SECRET` | *(generate a random string, e.g. run `openssl rand -hex 32` locally)* |
   | `FRONTEND_URL` | *(leave blank for now — update after Step 4)* |
   | `API_URL` | *(leave blank for now — update after Step 3 completes)* |
   | `ENABLE_DEV_LOGIN` | `true` |
   | `RUN_WORKER_IN_API` | `true` |
   | `GOOGLE_CLIENT_ID` | *(your Google OAuth client ID)* |
   | `GOOGLE_CLIENT_SECRET` | *(your Google OAuth client secret)* |

5. Click **Create Web Service**.

6. After the first deploy completes, note the **backend URL** (e.g., `https://reachbox-backend.onrender.com`). You'll need it for the frontend.

---

## Step 4: Deploy the Frontend

1. Go to **Dashboard** → **Create a new service** → **Static Site** (or **Web Service** for Node server).
   - Since this is Next.js, choose **Web Service** for full SSR support.

2. Connect your GitHub repository.
3. Configure:
   - **Name**: `reachbox-frontend`
   - **Root directory**: `frontend`
   - **Build command**: `npm ci && npm run build`
   - **Start command**: `npm start`
   - **Plan**: Free

4. Set **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | *(paste the backend URL from Step 3, e.g. `https://reachbox-backend.onrender.com`)* |
   | `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | `true` |

5. Click **Create Web Service**.

---

IN THE

---

## Step 6: Configure Google OAuth Callbacks

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Find your OAuth 2.0 Client ID.
3. Update:
   - **Authorized JavaScript origins**: Add `https://reachbox-frontend.onrender.com`
   - **Authorized redirect URIs**: Add `https://reachbox-backend.onrender.com/auth/google/callback`
4. Save.

---

## Verification

1. Visit your frontend URL (e.g., `https://reachbox-frontend.onrender.com`).
2. Try logging in with Google or the dev login form.
3. Check the backend logs on Render if anything fails.

---

## Important Notes

- **Free tier limitations**: Render free services sleep after 15 minutes of inactivity. The first request after sleep takes ~30-60 seconds to wake up.
- **Database migrations**: The `npm run db:deploy` in the start command ensures migrations run on each deploy.
- **Ethereal email**: The app uses Ethereal for email sending by default. In production, you may want to configure real SMTP credentials via the `ETHEREAL_SENDERS` env var.
- **Elasticsearch**: Not required — the app falls back to PostgreSQL ILIKE search when `ELASTICSEARCH_URL` is empty.
