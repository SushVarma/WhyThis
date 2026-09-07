# Why This — Institutional Memory for Engineering Teams

Answers "why does this code/decision exist?" by indexing GitHub commits/PRs, Slack
messages, and Jira tickets, then using retrieval + an LLM to synthesize a sourced
answer. Exposed as a web search/chat UI, an API, and a Slack `/why-this` slash command.

**Multi-tenant**: one deployment can serve multiple client companies. Each client gets
its own isolated project — its own API key, its own GitHub/Slack/Jira credentials, its
own indexed data. Nothing is shared across clients except the LLM inference backend.

**Marketing site**: [website/](website/) is a separate, plain static site (Home, About,
Prospectus, Contact) for pitching this to clients and investors — not part of the
product app, no build step, deployable to Vercel/Netlify/GitHub Pages/anywhere. See
[website/README.md](website/README.md).

## Repository structure

```
WhyThis/
├── backend/          FastAPI app — multi-tenant API, ingestion, retrieval, AI synthesis
├── frontend/          Next.js dashboard — Ask UI + client onboarding (Settings)
├── website/           Standalone static marketing site (Home/About/Prospectus/Contact)
└── docker-compose.yml  Postgres (pgvector) + backend + frontend, one command to run it all
```

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL + `pgvector` |
| AI | Hugging Face Inference API (`Qwen/Qwen2.5-72B-Instruct` + `sentence-transformers/all-MiniLM-L6-v2`) via `langchain-huggingface` |
| Integrations | GitHub REST API, Slack Web API + signed slash commands, Jira Cloud REST API |
| Infra | Docker Compose |

## Feasibility assessment

**Technically doable as an MVP, and it is built here end-to-end.** The hard parts are
well-trodden:
- GitHub/Slack/Jira all have straightforward REST APIs with token auth — no scraping.
- Retrieval is standard RAG: embed each commit/PR/message/ticket, store in Postgres
  with `pgvector`, cosine-similarity search, feed top-k into an LLM with a prompt
  that forces citation instead of invention.
- The Slack slash command is a signed webhook — verified here with HMAC per Slack's spec,
  using each client's own signing secret (resolved from the incoming `team_id`).

**What makes this hard to turn into a business isn't the tech, it's the data problem:**
- Answer quality is capped by how much of the "why" was ever written down. If a
  decision only happened in a hallway conversation, no integration will recover it.
  This is true of every idea on this list, but it hits "why" questions hardest since
  they're rarely as explicit as tickets/commits.
- Getting a company to grant GitHub + Slack + Jira read access requires trust — this
  is a sales/security conversation, not just a technical integration, especially for
  the Slack history scope (`channels:history`) which reads employee conversations.
- Precision matters more than most search products: a confidently wrong "why" is
  worse than "I don't know." The prompt in `backend/app/ai.py` is deliberately
  conservative — it's instructed to say when the context doesn't answer the question
  rather than guess. Worth pressure-testing with real teams before it's trusted.

None of this blocks building or piloting the MVP — it's why the validation plan below
matters more than more integrations.

## Architecture

```
Client A's GitHub/Slack/Jira ─▶ ingestion ─▶ embed (Hugging Face) ─▶ Postgres+pgvector
Client B's GitHub/Slack/Jira ─▶ ingestion ─▶ embed (Hugging Face) ─▶ Postgres+pgvector   (scoped by project_id)
                                                                              │
Client's dashboard ──X-API-Key + POST /why-this──▶ FastAPI ──search (scoped)─┘
Client's Slack "/why-this" ──POST /slack/commands (per-client HMAC)──▶ same pipeline
```

- **backend/app/models.py** — `Organization` → `Project` (one per client, holding its
  own `api_key` plus its own GitHub/Slack/Jira credentials) → `DecisionItem` (indexed
  content, scoped by `project_id`).
- **backend/app/api/auth.py** — resolves the calling `Project` from the `X-API-Key`
  header; every ingest/search route is scoped to that project.
- **backend/app/integrations/** — fetches raw data using whichever credentials are
  passed in (the calling project's), not global config.
- **backend/app/ingest.py** / **search.py** — embed+upsert and cosine-similarity
  retrieval, both scoped to one `project_id` so clients never see each other's data.
- **backend/app/ai.py** — synthesizes the cited answer via Hugging Face (`ChatHuggingFace`
  + `HuggingFaceEndpoint`, `Qwen/Qwen2.5-72B-Instruct`).
- **frontend/** — Next.js + Tailwind. `/` is the search/ask UI plus a data-sources
  sync panel; `/settings` creates client projects and connects their GitHub/Slack/Jira.
- **docker-compose.yml** — Postgres (with pgvector), backend, frontend.

## Running it

```bash
cp backend/.env.example backend/.env
# fill in HUGGINGFACEHUB_API_TOKEN (reuse the one from Startupvalidatior/Travel_Agent) —
# that's the only credential that's global; everything else is per-client, set from the UI.

docker compose up --build
```

- API: http://localhost:8000 (docs at `/docs`)
- Web UI: http://localhost:3000

### Onboarding a new client

1. Open `/settings` → "Create a new client project" with their company/project name.
   This returns an **API key** — that's their tenant boundary; keep it with them.
2. Still on `/settings`, enter their GitHub token + repo (and/or Slack/Jira credentials).
   These are stored per-project in the database, not in `.env`.
3. Go to `/` (Ask) → the "Data sources" panel shows what's connected → hit **Sync** to
   index it.
4. Ask a question. Every answer and every sync is scoped to that client's API key alone.

To manage a second client, create another project — its data, credentials, and API key
are completely separate from the first.

### Wiring up the Slack `/why-this` command (per client)

1. In the client's own Slack workspace, create a Slack app → add slash command
   `/why-this` pointing at `https://<your-public-backend-url>/slack/commands`.
2. Add bot scopes `channels:history`, `groups:history`, `users:read`; install to workspace.
3. On `/settings`, save that client's project with: Bot Token, Signing Secret, and
   Workspace/Team ID (found in Slack's "Basic Information" page — this is how an incoming
   slash command gets routed to the right client without them sending an API key).
4. Invite the bot to the channels you want indexed, then sync Slack with each channel ID.

## What's in the MVP (matches the intended wedge — nothing more)

- Multi-tenant: isolated projects, each with its own API key and credentials
- Connect GitHub, Slack, Jira per client (token-based)
- Index commits, PRs, Slack messages, Jira tickets
- AI-generated, citation-forced decision summaries
- Web search/chat interface + a Settings page for onboarding new clients
- `/why-this` Slack command, routed per client by workspace

## Deliberately not built yet

Per the product brief, these are out of scope until the wedge is validated:
a general company chatbot, a Notion clone, a full knowledge graph UI, meeting
transcription, dozens of integrations, employee surveillance, or any autonomous
decision-making. Also not yet built (straightforward additions once you have paying
clients, not core to proving the idea):
- **Real user authentication.** `POST /projects` (project creation) has no auth gate —
  anyone with the API URL can create a project. Fine while you're doing white-glove
  onboarding for a handful of design partners; needs a real login (Clerk/Auth.js/etc.,
  as the original brief suggested) before self-serve signup.
- **Encryption at rest for stored tokens.** GitHub/Slack/Jira credentials sit in Postgres
  as plaintext strings. Acceptable for a pilot on infrastructure you control; encrypt
  (e.g. via `pgcrypto` or an app-level KMS-backed field) before handling client secrets
  at scale.
- Background/scheduled re-indexing (Sync is manual/on-demand right now).
- Billing/usage metering against the pricing tiers in the original brief.
- Incremental Slack thread-reply indexing.

## Suggested next step (Experiment A from the brief)

Don't build more integrations yet. Get this running against 3-5 real engineering
teams' GitHub repos (+ Slack if they'll grant it) for free, and watch whether they
come back and ask it more `/why-this` questions on their own — that's the signal
worth building a business on.

---

**Status**: private, pre-revenue, early-stage. All rights reserved — this repository
is not licensed for reuse. Questions, pilots, or partnership interest:
sushma.verma@instalogic.in.
