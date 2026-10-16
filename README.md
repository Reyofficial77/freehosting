# FreeHosting

FreeHosting is a Next.js + TypeScript platform that publishes a website from a ZIP archive. It validates the archive, detects the framework, deploys it to Vercel through the REST API, and maps a per-project subdomain on Neon PostgreSQL metadata.

This repository implements the end-to-end MVP flow defined in the PRD:

**Upload ZIP → validate → detect framework → deploy to Vercel → map `slug.host.my.id` → HTTPS status → metadata in Neon.**

## Requirements
- Node.js 20+
- A Neon PostgreSQL database
- A Vercel account token (server-side)

## Run locally (Windows PowerShell)
```powershell
npm install
Copy-Item .env.example .env.local
```
Set the values described below in `.env.local`, then:
```powershell
npm run db:push   # or run the SQL files in ./drizzle manually
npm run dev
```
Open `http://localhost:3000`.

## Environment variables
See `.env.example`. Key values:
- `DATABASE_URL` — Neon connection string (`sslmode=require`).
- `SESSION_SECRET` — 32+ random characters; signs the guest cookie.
- `DEPLOY_API_TOKEN` — Vercel token used to create deployments and map domains.
- `DEPLOY_TEAM_ID` — team id when deploying under a team.
- `DEPLOY_ENABLED` — set to `false` to run upload as validation-only.
- `PROJECT_DOMAIN` — suffix for project subdomains (default `host.my.id`).
- Quota variables — `QUOTA_*`, `MAX_UPLOAD_BYTES` (bytes, default 50 MB).
- Deployed sites are previewed embedded inside the dashboard (`/projects/[id]`).
  The UI never links users out to `*.vercel.app` directly.

**Never expose these with a `NEXT_PUBLIC_` prefix.** The Vercel token is server-only.

## Deploy the dashboard to Vercel
1. Push this folder to a GitHub repository.
2. Import the repository in Vercel (this is the *dashboard* project — keep it separate from user projects).
3. Add the environment variables above in Project → Settings → Environment Variables.
4. Apply the schema to your Neon database (`npm run db:push` locally, or run the SQL in `drizzle/`).
5. Deploy, then check `/api/health` — it should report `database: "connected"` and `deploy: "configured"`.

## What is implemented
- **Landing page** and responsive dark UI; upload form with live deployment polling.
- **ZIP safety** (`src/lib/zip.ts`): rejects path traversal, symlinks, too many entries, oversized entries and archives that expand beyond the cap; enforces a total deployable-byte limit.
- **Framework detection**: Next.js, Astro, Vite (React/Vue), Nuxt, Angular, Create React App, Vue CLI and static HTML, mapped to the Vercel `projectSettings.framework` enum. Common root-folder wrapping is detected.
- **Vercel integration** (`src/lib/vercel.ts`, `src/lib/deploy.ts`): creates non-git deployments from inlined files, polls deployment state, maps the project subdomain, and cleans up provider resources on delete.
- **Deployment lifecycle**: internal statuses (`queued`, `deploying`, `building`, `ready`, `failed`, …) synced from the provider; history and build-log links surfaced in the UI.
- **Quotas** (`src/lib/quota.ts`): server-enforced project-count and daily-deployment limits per guest/user, configurable by environment variable.
- **Ownership checks**: every project operation is scoped to the signed guest session to prevent IDOR.
- **Database**: Drizzle schema and SQL migrations for users, accounts, projects, deployments, domains, project settings, usage, GitHub installations and jobs.

## API
- `POST /api/detect` — inspect a ZIP (file or import URL) and return framework detection, no DB write.
- `POST /api/upload` — validate, detect, persist and deploy a ZIP. Accepts optional `buildCommand`, `outputDirectory`, `rootDirectory`, `installCommand`, `packageManager` overrides.
- `GET /api/projects` — list the caller's projects with latest deployment status.
- `GET /api/projects/{id}` — project detail (ownership enforced).
- `PATCH /api/projects/{id}` — rename, change slug (re-maps the domain) and build settings.
- `DELETE /api/projects/{id}` — remove provider projects/domains/deployments and the record.
- `POST /api/projects/{id}/redeploy` — new deployment from the last provider deployment.
- `GET /api/deployments/{id}` — refresh and return a deployment's status/domain.
- `GET /api/health` — database and deploy-configuration status.

## Known limitations (honest readiness notes)
- **Registered accounts and GitHub import are not implemented yet.** Every caller is a guest scoped by a signed cookie; the schema already models `users`, `auth_accounts` and `github_installations` for the next phase. Guests cannot claim projects to an account yet.
- **No object storage / queue worker.** Files are materialized in memory for the deploy request; large projects rely on the Vercel inline-file path. A production system should use object storage plus a background job queue (the `jobs` table is present but processing is synchronous).
- **Domain mapping requires DNS.** The wildcard `*.host.my.id` must be configured in Vercel for `PROJECT_DOMAIN`; the API only registers the hostname with the provider. HTTPS verification is reported from the provider and is not guaranteed until DNS propagates.
- **Framework detection is heuristic** and does not execute user scripts; a successful detection does not guarantee a successful build.
- **No uploaded user code is executed** in this app's API process.
- **Admin tooling, abuse reporting, monitoring and rate limiting beyond quotas are still to be built.**

## Migration notes
- `drizzle/0002_deployment_orchestration.sql` adds provider tracking columns and quota indexes. It is additive and safe to re-run.
- If upload previously failed with `Failed query: insert into "projects"`, run `drizzle/0001_repair_existing_projects.sql` in the Neon SQL editor first.
