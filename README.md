# Caesium
**The all-in-one workspace for software agencies**

Caesium is a web-based management platform built for software development agencies. It brings together the tools a typical agency uses across multiple disconnected apps — project tracking, requirements, estimation, delivery, code review, and sales — into one place.

![Dashboard](public/docs/dashboard.png)

---

## What is Caesium?

Running a software agency means juggling a lot at once: scoping new work, managing active projects, reviewing code, and keeping clients informed. Most teams end up stitching together several tools to handle this — one for project tracking, another for documents, another for sales, and so on.

Caesium is an attempt to cover that entire lifecycle in a single platform, with some AI assistance built in where it genuinely helps (generating requirement documents, reviewing pull requests, answering questions about past work).

It is designed for teams of mixed roles — project managers, developers, and sales staff — each seeing a view tailored to what they actually need.

---

## Features

### Projects & Team Management
Create and manage client projects from a central dashboard. Project Managers can set up projects, assign developers, and track progress through each stage. Developers only see the projects they have been assigned to.

![Projects](public/docs/projects.png)

### PRD Generation
Caesium can generate a Product Requirements Document for a project through a guided interview — you answer a series of questions about the project, and it drafts the PRD. The document lives inside the project and can be edited after generation.

![PRD](public/docs/prd.png)

### Estimation & Timeline
Break down project work into tasks with effort estimates. Caesium rolls these up into a project timeline that gives a clear picture of scope and schedule.

![Estimation](public/docs/estimation.png)

### Delivery Tracking
Track what has been built and shipped. The delivery tab keeps a record of what has been completed across a project's lifetime.

![Delivery](public/docs/delivery.png)

### AI Code Review
Connect a GitHub repository to a project and Caesium will automatically review every pull request. When a PR is opened, it posts a structured review as inline comments directly on GitHub — flagging issues, suggesting improvements, and giving a verdict. Review behaviour is configurable per project.

![Code Review](public/docs/code-review.png)

### Knowledge Base
Every PRD, estimate, status report, and code review generated in Caesium is indexed and searchable. You can ask plain-English questions — "What tech stack did we use for the Acme project?" or "Which estimates ran over?" — and get answers sourced from your agency's own history.

![Knowledge Base](public/docs/knowledge-base.png)

### Sales Pipeline, Proposals & Win/Loss
Track prospective clients through a sales pipeline, generate proposals, and record the outcome of deals. This side of the platform is aimed at principals and sales staff rather than developers.

![Sales](public/docs/sales.png)

---

## User Roles

Caesium has four roles. Access to features and data is controlled by role — users only see what is relevant to them.

| Role | What they can do |
|---|---|
| **Admin** | Full access to everything, including user management |
| **Project Manager** | Create and manage projects, assign developers, oversee delivery |
| **Developer** | View and work within projects they have been assigned to |
| **Sales** | Access the pipeline, proposals, and win/loss pages |

Admins automatically have all permissions — they do not need to be assigned additional roles.

---

## Tech Stack

| Technology | Role in Caesium |
|---|---|
| [Next.js 16](https://nextjs.org) | Web framework — handles routing, server rendering, and API routes |
| [Supabase](https://supabase.com) | Database (PostgreSQL), authentication, and file storage. Row-level security enforces data access rules at the database level |
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL extension that powers the Knowledge Base — stores and searches document embeddings |
| [Inngest](https://inngest.com) | Background job runner — handles async tasks like AI generation and webhook processing without blocking the UI |
| [Vercel AI SDK](https://sdk.vercel.ai) | Abstraction layer for calling AI models. Currently uses Google Gemini; can be switched to Claude or others via environment variables |
| [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Styling and UI components |

---

## Running Locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A Google AI API key (free at [aistudio.google.com](https://aistudio.google.com/apikey))

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example below into a file called `.env.local` at the project root and fill in your values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=

   AI_PROVIDER=google
   AI_MODEL=gemini-2.5-flash
   GOOGLE_GENERATIVE_AI_API_KEY=

   INNGEST_DEV=1

   LINEAR_API_KEY=
   GITHUB_TOKEN=
   GITHUB_WEBHOOK_SECRET=
   ```

   See the [Environment Variables](#environment-variables) section below for details on each.

4. **Run the database migrations**

   Apply the SQL files in `supabase/migrations/` to your Supabase project, in order, using the Supabase SQL editor or CLI.

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

---

## Deploying

Caesium is designed to deploy on [Vercel](https://vercel.com). See [`011-deploy.md`](./011-deploy.md) for a complete step-by-step walkthrough, including how to deploy without a GitHub integration using the Vercel CLI.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — bypasses row-level security. Server-side only, never exposed to the browser |
| `AI_PROVIDER` | Yes | AI provider to use: `google` or `anthropic` |
| `AI_MODEL` | Yes | Model name, e.g. `gemini-2.5-flash` or `claude-sonnet-4-6` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If using Google | Google AI Studio API key |
| `ANTHROPIC_API_KEY` | If using Anthropic | Anthropic API key |
| `INNGEST_EVENT_KEY` | Production only | From the Inngest dashboard — not needed for local dev |
| `INNGEST_SIGNING_KEY` | Production only | From the Inngest dashboard — not needed for local dev |
| `INNGEST_DEV` | Local dev only | Set to `1` in local development. Omit in production |
| `LINEAR_API_KEY` | Optional | Linear personal API key, used for activity tracking |
| `GITHUB_TOKEN` | Optional | GitHub fine-grained personal access token, used for code review |
| `GITHUB_WEBHOOK_SECRET` | Optional | Secret for validating incoming GitHub webhook payloads |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/               # All authenticated pages
│   │   ├── page.tsx         # Dashboard (role-aware)
│   │   ├── projects/        # Project list, creation, and per-project workspace
│   │   │   └── [id]/        # Project workspace tabs (requirements, PRD, estimation, etc.)
│   │   ├── knowledge/       # Knowledge base chat interface
│   │   ├── admin/           # User management (admin only)
│   │   ├── proposals/       # Sales proposals
│   │   └── win-loss/        # Deal outcome tracking
│   ├── api/
│   │   ├── github/webhook/  # Receives GitHub PR events and queues code review jobs
│   │   └── inngest/         # Inngest job handler endpoint
│   └── login/               # Authentication page
├── components/
│   ├── layout/              # App shell, sidebar, topbar, workspace tabs
│   ├── search/              # Global search bar
│   └── ui/                  # shadcn/ui base components
├── config/
│   └── app.ts               # App name, tagline, and derived values — edit here to rebrand
├── lib/
│   ├── auth.ts              # Authentication helpers and role checks
│   ├── codereview/          # AI code review logic and GitHub comment rendering
│   ├── connectors/          # GitHub and Linear API clients
│   ├── db/                  # Database types
│   ├── inngest/             # Background job definitions
│   ├── kb/                  # Knowledge base indexing and retrieval
│   ├── projects/            # Project data access
│   └── supabase/            # Supabase client setup (browser, server, admin)
└── supabase/
    └── migrations/          # SQL migration files — apply these to set up the database schema
```
