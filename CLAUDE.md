# Paperxlip

AI workforce orchestration for construction programme management. Built by **Mace Digital** (the digital technology team within **Mace Consult**). Fork of [Paperclip](https://github.com/paperclipai/paperclip) with a domain-specific knowledge synthesis layer.

## Context

- **Mace Consult** became a standalone company on 5 March 2026 (Goldman Sachs Alternatives majority stake), separating from **Mace Construct** (which retained the contracting and construction delivery business). ~£800M revenue, 5,500 staff across six continents. Programme/project management, strategic advisory, cost management.
- **Mace Digital** is the team within Mace Consult that builds digital tools for programme delivery — PMO, data analytics, process automation, Power BI reporting. As a standalone consultancy, Mace Consult now operates independently of Mace Construct's balance sheet, giving Mace Digital direct runway to develop and commercialise its AI platform.
- **Paperxlip** is Mace Digital's AI workforce platform. It orchestrates AI agents across Mace Consult's project portfolio, with a shared knowledge layer that synthesises across every project.

## Vision

Each Mace Consult project (NHP, Northern Metropolis, etc.) is a knowledge silo — its own SharePoint site, Dataverse environment, Teams channels, email threads. Senior people hold critical context in their heads and leave. The Mace Context layer is the synthesis across all of them: persistent, searchable, reasoned institutional knowledge that survives attrition.

Goldman Sachs's investment specifically targets digital tools for greater predictability, automation and control. This is that.

## Architecture

```
Mace Consult
  '- Mace Digital (team)
       '- Paperxlip (platform)
            |
            Mace Context Layer  (RAG — SharePoint, Dataverse, Teams, emails)
            |
            Agent Orchestration (org charts, budgets, governance, heartbeats)
            |
            +-- Project: NHP (New Hospital Programme)
            |     |- Risk Agent         watches risk register, flags escalations
            |     |- Commercial Agent   tracks variations, drafts NEC4 responses
            |     |- Programme Agent    monitors milestones, coordinates agents
            |     |- Compliance Agent   checks RIBA stages, CDM, Building Safety Act
            |     '- Knowledge Agent    continuously ingests & indexes documents
            |
            +-- Project: MWCC Migration
            |     |- Platform Agent     configures Dataverse/Power Platform environments
            |     '- Knowledge Agent    ingests and indexes MWCC documents
            |
            '-- Project: [any Mace Consult project]
                  |- (deployed from template)
```

Paperclip's company = a Mace Consult project. Multi-company isolation = multi-project isolation.

## Stack

- **Upstream**: Paperclip (MIT) — Node.js 20+, React, PostgreSQL, Drizzle ORM, pnpm monorepo
- **Added**: `packages/mace-context` — knowledge ingestion & RAG
- **Added**: `templates/` — project template configs (NHP, Mace Consult demo, generic construction)
- **Added**: SharePoint adapter via Microsoft Graph API
- **Currency**: GBP (£) throughout — `formatCents` returns `£`, finance schema defaults to GBP

## Monorepo Structure

```
server/           Paperclip REST API + heartbeat engine
  src/
    routes/
      templates.ts   Template import/apply routes — always passes full include
    services/
      template-library.ts  Converts JSON templates to portability file bundles
ui/               React dashboard
  src/
    components/
      IssuesList.tsx   List / Board / Swimlane / Agile view toggle
      KanbanBoard.tsx  Status-column kanban (existing)
      SwimlaneBoard.tsx  Project-row × status-column grid [NEW]
      AgileBoard.tsx   Sprint board + collapsible backlog/done [NEW]
      BudgetPolicyCard.tsx  Shows budget in GBP
cli/              CLI tooling
packages/
  db/             Drizzle schema + migrations
    schema/
      finance_events.ts  currency defaults to GBP
  adapters/       Agent adapters (Claude, Codex, Cursor, process, HTTP)
  adapter-utils/  Shared adapter utilities
  shared/         Shared types
  mace-context/   Knowledge ingestion, vector store, RAG pipeline
    src/
      ingestors/
        sharepoint.ts  Full Graph API implementation (delta sync, drives + lists)
        dataverse.ts   Stub — returns []
      store/
        vector-store.ts  pgvector (embedding column, not embedding_json)
templates/        Project template configs (JSON)
  mace-demo.json       Demo workspace — 6 agents, 3 projects, 12 issues [NEW]
  mace-consult.json    Mace Consult full workforce
  nhp.json             New Hospital Programme
  generic-construction.json
skills/           Reusable agent capabilities
```

## Development

```bash
pnpm install
pnpm dev          # API (:3100) + UI
pnpm dev:server   # Server only
pnpm build        # Build all packages
pnpm test:run     # Tests
pnpm db:generate  # Create migration
pnpm db:migrate   # Apply migrations
```

## Deployment (Mac Mini)

- pm2 process: `paperxlip` (port 3112, internal)
- Caddy: `paperxlip-caddy` (port 3111, proxied)
- CF Tunnel → `paperxlip.stephen8n.com` → localhost:3111
- URL scheme: `/{ISSUE_PREFIX}/issues` e.g. `/DEMO/issues`
- **Deploy**: edit source files, `pm2 restart paperxlip` (tsx runs source directly — no build step for server)
- **UI build**: `cd ~/paperxlip/ui && pnpm build` (only needed for UI changes)

## Mace Context Package

`packages/mace-context/` handles:

1. **Ingest** — SharePoint (Graph API, full impl), Dataverse (OData, stub)
2. **Chunk & Embed** — split documents, generate embeddings (Gemini text-embedding-005, 768-dim)
3. **Store** — pgvector in the existing PostgreSQL instance (`embedding vector(768)` column, HNSW index)
4. **Retrieve** — semantic search + metadata filtering per project
5. **Synthesise** — cross-project pattern matching, precedent lookup

### VectorStore

Uses `embedding vector(768)` column (pgvector). INSERT uses `::vector` cast with `[x,y,...]` literal.
The old `embedding_json text` column is gone — do not reintroduce it.

### SharePointIngestor

Full Microsoft Graph API implementation:
- Auth: client credentials (tenantId/clientId/clientSecret) or direct accessToken
- Delta sync per drive (persists delta tokens in memory)
- Downloads .docx/.xlsx/.pdf/.txt/.md via `/content?format=text`
- Lists: each row becomes a structured document

### DataverseIngestor

Still a stub — `fetchDocuments()` returns `[]`. Not yet implemented.

## Project Templates

`templates/` contains JSON configs applied via `/api/templates/{id}/apply`.

### Template Format

```json
{
  name: ...,
  description: ...,
  issuePrefix: DEMO,
  contractType: NEC4,
  regulatoryFramework: [NHS, RIBA],
  agents: [{ name, role, title, icon, reportsTo, budgetMonthlyCents, capabilities, skills, promptContext, adapterType }],
  projects: [{ name, description, leadAgent, targetDate }],
  issues: [{ title, status, priority, assigneeAgent, project, description }],
  goals: [...]
}
```

### Template → Portability Bundle

`server/src/services/template-library.ts` converts JSON → file bundle:

| Template field | Generated file | Notes |
|---|---|---|
| Company metadata | `COMPANY.md` | YAML frontmatter with name/description required |
| `agents[]` | `agents/{slug}/AGENTS.md` | Frontmatter: name, title, reportsTo, skills |
| Agent extension data | `.paperclip.yaml` → `agents.{slug}` | role, icon, capabilities, budgetMonthlyCents, adapter |
| `projects[]` | `projects/{slug}/PROJECT.md` | Frontmatter: name, description |
| Project extension data | `.paperclip.yaml` → `projects.{slug}` | leadAgentSlug, targetDate, status |
| `issues[]` | `issues/{slug}/TASK.md` | Frontmatter: title, project (slug), assignee (slug) |
| Issue extension data | `.paperclip.yaml` → `tasks.{slug}` | identifier, status, priority |

**Critical**: The portability importer (`buildManifestFromPackageFiles`) rebuilds the manifest entirely from the file tree — it does NOT use any manifest object in the `files` map. File naming conventions are mandatory:
- Agents: `agents/{slug}/AGENTS.md`
- Projects: `projects/{slug}/PROJECT.md`
- Issues: `issues/{slug}/TASK.md`
- Company: `COMPANY.md` (uppercase, with YAML frontmatter)

`status` and `priority` for issues come from `.paperclip.yaml tasks.{slug}`, NOT from TASK.md frontmatter.

The template routes (`routes/templates.ts`) hardcode `include: { company: true, agents: true, projects: true, issues: true, skills: false }` — the DEFAULT_INCLUDE in the portability service is `projects: false, issues: false` and would skip them otherwise.

## Issue Views

Issues page supports four views toggled in `IssuesList.tsx`:

| View | Component | Description |
|---|---|---|
| List | (inline) | Flat filterable list |
| Board | `KanbanBoard` | Status columns with drag-and-drop |
| Swimlane | `SwimlaneBoard` | Rows = projects, columns = statuses |
| Agile | `AgileBoard` | 4-column sprint + collapsible backlog/done |

## Key Concepts

- **Agent** = AI worker with a role, budget, and position in the org chart
- **Heartbeat** = scheduled execution window (timer/assignment/on-demand)
- **Adapter** = how the agent runs (Claude CLI, Codex, HTTP, process)
- **Company** = a Mace project with isolated data, URL-keyed by `issuePrefix`
- **Mace Context** = the cross-project knowledge synthesis layer
- **Template** = pre-configured project setup with agents, projects, and issues

## Remotes

- `origin` — github.com/stephencummins/paperxlip (our fork)
- `upstream` — github.com/paperclipai/paperclip (keep in sync)

## Known Issues

- GitHub push blocked: upstream merge commit `f449615d` modified workflow files; pushing requires a PAT with `workflow` scope (Mini's OAuth token lacks it)
- `@paperxlip/mace-context` must be in `server/package.json` dependencies — it won't resolve automatically from the monorepo with tsx
