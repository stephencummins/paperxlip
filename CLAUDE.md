# Paperxlip

AI workforce orchestration for construction programme management. Built by **Mace Digital** (the digital technology team within **Mace Consult**). Fork of [Paperclip](https://github.com/paperclipai/paperclip) with a domain-specific knowledge synthesis layer.

## Context

- **Mace Consult** became a standalone company on 5 March 2026 (Goldman Sachs Alternatives majority stake). ~$1B revenue, 5,500 staff across six continents. Programme/project management, strategic advisory, cost management.
- **Mace Digital** is the team within Mace Consult that builds digital tools for programme delivery — PMO, data analytics, process automation, Power BI reporting.
- **Paperxlip** is Mace Digital's AI workforce platform. It orchestrates AI agents across Mace Consult's project portfolio, with a shared knowledge layer that synthesises across every project.

## Vision

Each Mace Consult project (NHP, Northern Metropolis, etc.) is a knowledge silo — its own SharePoint site, Dataverse environment, Teams channels, email threads. Senior people hold critical context in their heads and leave. The Mace Context layer is the synthesis across all of them: persistent, searchable, reasoned institutional knowledge that survives attrition.

Goldman Sachs's investment specifically targets "digital tools for greater predictability, automation and control." This is that.

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
            +-- Project: Northern Metropolis (Hong Kong)
            |     |- ...
            |
            '-- Project: [any Mace Consult project]
                  |- (deployed from template)
```

Paperclip's "company" = a Mace Consult project. Multi-company isolation = multi-project isolation.

## Stack

- **Upstream**: Paperclip (MIT) — Node.js 20+, React, PostgreSQL, Drizzle ORM, pnpm monorepo
- **Added**: `packages/mace-context` — knowledge ingestion & RAG
- **Added**: `templates/` — project template configs (NHP, generic construction)
- **Added**: SharePoint adapter via Microsoft Graph API

## Monorepo Structure

```
server/           Paperclip REST API + heartbeat engine
ui/               React dashboard
cli/              CLI tooling
packages/
  db/             Drizzle schema + migrations
  adapters/       Agent adapters (Claude, Codex, Cursor, process, HTTP)
  adapter-utils/  Shared adapter utilities
  shared/         Shared types
  mace-context/   [NEW] Knowledge ingestion, vector store, RAG pipeline
templates/        [NEW] Project template configs
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

## Mace Context Package

`packages/mace-context/` handles:

1. **Ingest** — SharePoint (Graph API), Dataverse (OData), email, Teams transcripts
2. **Chunk & Embed** — split documents, generate embeddings (Gemini/OpenAI)
3. **Store** — pgvector in the existing PostgreSQL instance
4. **Retrieve** — semantic search + metadata filtering per project
5. **Synthesise** — cross-project pattern matching, precedent lookup

## Project Templates

`templates/` contains JSON configs that spin up a full agent team:

- `nhp.json` — New Hospital Programme (NEC contract, NHS compliance, HDP governance)
- `generic-construction.json` — baseline for any Mace construction project
- Templates define: agent roles, org chart, budget allocation, skills, SharePoint site URLs

## Key Concepts

- **Agent** = AI worker with a role, budget, and position in the org chart
- **Heartbeat** = scheduled execution window (timer/assignment/on-demand)
- **Adapter** = how the agent runs (Claude CLI, Codex, HTTP, process)
- **Company** = a Mace project with isolated data
- **Mace Context** = the cross-project knowledge synthesis layer
- **Template** = pre-configured project setup with role-appropriate agents

## Remotes

- `origin` — github.com/stephencummins/paperxlip (our fork)
- `upstream` — github.com/paperclipai/paperclip (keep in sync)
