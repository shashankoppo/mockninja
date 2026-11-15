# Mock Ninja — Deployment Guide

## Architecture

- **Frontend**: React + Vite SPA, served by nginx in a Docker container
- **Backend**: Supabase (Postgres database, Auth, Edge Functions, Storage, Realtime)
- **AI**: Google Gemini 2.5 Flash via edge functions (question generation)

The frontend talks directly to Supabase from the browser. Edge functions handle server-side operations (exam grading, AI generation, payments, user management).

## Prerequisites

1. A Supabase project with all migrations applied
2. Docker and Docker Compose installed
3. The following environment variables ready

## Environment Variables

Create a `.env` file in the project root:

```env
# Required — from Supabase dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

These are build-time variables (baked into the frontend bundle). They are safe to expose to the browser — the anon key is designed to be public, and RLS policies protect your data.

The container always listens on **port 8063**. No port variable is needed.

## Supabase Dashboard Configuration

Before deploying, configure these in the Supabase dashboard:

### 1. Authentication
- **Providers → Email**: Enable email/password sign-up
- **Email Templates → "Confirm signup"**: Use `{{ .Token }}` for OTP codes (not `{{ .ConfirmationURL }}`)
- **Email Settings → SMTP**: Configure a real SMTP server for reliable email delivery

### 2. Edge Function Secrets
Set these as Supabase secrets (Dashboard → Edge Functions → Secrets):
- `GEMINI_API_KEY` — Google Gemini API key (for AI question generation)

### 3. Storage
- The `question-media` bucket is created by migration. Verify it exists.

## Deployment Steps

### Option A: Coolify (recommended)

Full setup, step by step:

**Step 1 — Push the code to GitHub.** Coolify deploys from a Git
repository, so commit this project and push it to GitHub (or any Git
host) first.

**Step 2 — Create the app in Coolify.**
1. In your Coolify dashboard: **New Resource → Docker Compose**.
2. Select your Git repository and the `main` branch.
3. Coolify reads the `docker-compose.yml` in the repo root automatically.

**Step 3 — Add the two environment variables.** In the app's
**Environment Variables** section, add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

Both come from **Supabase dashboard → Settings → API**. These are needed
at build time — without them the deployed site cannot load any data.

**Step 4 — Set the port.** In the app settings, find the **Port exposes**
field and enter `8063`. That is the only port number in the whole setup.

**Step 5 — Set the domain.** In the **Domains** section, enter your
public address (for example `https://mockninja.in`) and enable **Let's
Encrypt** so Coolify issues the SSL certificate automatically.

**Step 6 — Deploy.** Click **Deploy**. The first build takes a few
minutes. When it finishes, Coolify shows the container as healthy and
your domain serves the app.

Notes:
- The container never publishes a host port, so it can never clash with
  Coolify's own proxy — the earlier "port 8080 already allocated" failure
  cannot happen with this setup.
- Changing the Supabase variables later requires a **rebuild** (Redeploy
  with cache cleared), because they are baked into the app at build time.

### Option B: Docker Compose (own server)

```bash
# 1. Create .env file with your Supabase URL and anon key
cp .env.example .env
# Edit .env with real values

# 2. Build and start the container
docker compose up -d --build

# 3. Verify it's running
curl http://localhost:8063/
```

### Option C: Standalone Docker

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  -t mock-ninja .

docker run -d -p 8063:8063 --name mock-ninja --restart unless-stopped mock-ninja
```

### Option D: Static hosting (Vercel, Netlify, Cloudflare Pages)

```bash
# Build the frontend
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build

# Deploy the dist/ folder to any static host
# Configure SPA fallback: all routes → index.html
```

## Post-Deployment Checklist

- [ ] Visit the site and verify the landing page loads
- [ ] Test sign-up flow (verify OTP email arrives if email confirmation is enabled)
- [ ] Test sign-in flow
- [ ] Verify admin panel accessible at `/admin` (requires ADMIN role)
- [ ] Test exam flow end-to-end (start → answer → submit → results)
- [ ] Verify leaderboard loads
- [ ] Test on mobile viewport
- [ ] Check that security headers are present (use browser dev tools → Network)
- [ ] Verify gzip compression is working
- [ ] Test offline support (service worker should cache pages)

## Database Migrations

All migrations are in `supabase/migrations/` and are applied automatically by Supabase. To check migration status:

```
Supabase Dashboard → Database → Migrations
```

Never edit or delete existing migrations. Always add new ones.

## Edge Functions

Edge functions are deployed via the Supabase MCP tools, not the CLI. To deploy:

1. Write the function source to `supabase/functions/<name>/index.ts`
2. Add a `[functions.<name>]` table in `supabase/config.toml` with `verify_jwt` set
3. Use the Supabase MCP `deploy_edge_functions` tool

Current edge functions:
- `exam` — server-side exam grading
- `generate-ai-questions` — AI question generation via Gemini
- `daily-mock` — daily mock test generation (cron)
- `import-questions` — bulk question import
- `mistake-reattempt` — mistake retry flow
- `guardian-consent` — guardian consent for minors
- `support-notify` — support inquiry notifications
- `admin-remove-user` — admin user deletion
- `self-delete-user` — self-service account deletion

## Health Check

The Docker container includes a health check at `http://localhost:8063/`. Monitor with:

```bash
docker compose ps   # shows health status
docker logs mock-ninja  # view nginx logs
```

## Security

- All database tables have Row Level Security (RLS) enabled
- Admin functions have EXECUTE revoked from non-admin roles
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.) are set by nginx
- Service worker caches are versioned and cleaned up on activate
- Anonymous Supabase key is safe to expose — RLS policies enforce access control

## Performance

- Routes are code-split: each page loads as a separate chunk
- Vendor libraries (React, Supabase, KaTeX, icons) are in separate chunks
- Hashed assets are cached for 1 year (immutable)
- Gzip compression is enabled for all text-based responses
- Service worker provides offline support with cache-first strategy for assets

## Troubleshooting

**Blank page after deploy**: Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were set correctly during the Docker build. These are build-time args — changing them requires a rebuild.

**OTP emails not arriving**: Configure SMTP in Supabase dashboard → Authentication → Email Settings. The built-in email sender has rate limits and may land in spam.

**Admin functions fail with "permission denied"**: Ensure the user has ADMIN role in the `profiles` table. The admin functions check `auth.uid()` against the profiles table.

**404 on page refresh**: Ensure your hosting platform is configured for SPA fallback (all routes → index.html). Docker/nginx config already handles this.
