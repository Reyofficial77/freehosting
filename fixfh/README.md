# FreeHosting — Vercel-ready application foundation

FreeHosting is a Next.js + TypeScript app based on the supplied PRD. It includes a responsive landing page, upload UI, ZIP validation, framework detection, guest-scoped project metadata, dashboard, Neon PostgreSQL schema, Drizzle ORM and health endpoint.

> **Honest readiness note:** the dashboard itself can be hosted on Vercel after environment configuration. This repository is not yet a complete public multi-tenant hosting provider: Vercel ZIP deployment orchestration, `*.host.my.id` domain assignment, GitHub OAuth, authenticated accounts, job queue/object storage, quotas, deployment logs, and security/load testing still need to be implemented and verified. Upload currently validates the archive and saves metadata; it does not claim to publish the uploaded website.

## Requirements
- Node.js 20+
- pnpm 9+ (or npm)
- Neon PostgreSQL database

## Run locally (Windows PowerShell)
```powershell
pnpm install
Copy-Item .env.example .env.local
```
Set `DATABASE_URL` and a long random `SESSION_SECRET` in `.env.local`, then:
```powershell
pnpm db:push
pnpm dev
```
Open `http://localhost:3000`.

## Deploy the dashboard to Vercel
1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Create a Neon database and copy its PostgreSQL connection string.
4. In Vercel → Project → Settings → Environment Variables, set:
   - `DATABASE_URL` = Neon connection string (include `sslmode=require`)
   - `SESSION_SECRET` = a cryptographically random secret of 32+ characters
   - `MAX_UPLOAD_BYTES` = `4194304` (optional, default 4 MiB)
5. Deploy. Apply schema against the Neon database from your local terminal with `pnpm db:push` before testing upload.
6. Check `/api/health`; it should return `{"ok":true,"database":"connected"}`.

Do not expose secrets with a `NEXT_PUBLIC_` prefix. Do not deploy publicly as a hosting service until authentication/authorization, rate limits, provider isolation, abuse handling and the end-to-end deployment flow have been implemented.

## Included
- Landing page and responsive styling
- Upload form and server-side ZIP checks
- Rejects traversal paths, symlinks, excessive entry counts, large entries and excessive total expanded size
- Framework heuristics informed by package.json dependencies and lockfiles
- Guest session cookie signed with HMAC; project list is scoped to that browser session
- Dashboard with empty, database unavailable and project-list states
- API routes: `POST /api/upload`, `GET /api/projects`, `GET /api/health`
- Drizzle schema and initial SQL for users, accounts, projects, deployments, domains, project settings, usage, GitHub installations and jobs

## Important implementation limitations
- ZIP content is inspected in memory; a production system should use object storage and background jobs.
- Guest session projects are not claimable by an account yet.
- The schema is prepared for future auth but OAuth/session login is not implemented.
- Framework detection is heuristic; it does not execute user scripts.
- No uploaded user code is run in this app's API process.
- Vercel token/project/domain environment variables are not used to deploy projects yet; do not assume a project URL or custom domain exists until provider integration is completed.
