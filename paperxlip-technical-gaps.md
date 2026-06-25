# Paperxlip — Technical Gap Analysis

## What Actually Exists

- Paperclip base — agent orchestration, heartbeats, org chart, budgets, adapters ✓
- `packages/mace-context` — ingestion pipeline, pgvector schema, RAG search ✓
- `docgen` services — Word/PowerPoint template filling, onboarding, sync ✓
- Knowledge UI — template management panel ✓
- `templates/nhp.json` — NHP agent config ✓

---

## What's Missing

### Microsoft 365 Integration (biggest gap)
- The SharePoint adapter exists but there's no OAuth flow — no real auth against a live M365 tenant
- No actual SharePoint site *provisioning* on project creation (creating libraries, setting permissions)
- No Teams channel creation via Graph API
- No Outlook calendar integration

### The Onboarding Agent
- The docgen onboard service handles template upload, not the "5 questions → full project setup" flow
- The conversational interview → automated provisioning pipeline doesn't exist yet

### Document Approval
- No approval state machine, reviewer notifications, comment consolidation, or version publishing

### Timesheets
- Nothing built — no WBS code tracking, no weekly submission flow

### Shared Calendar
- Nothing built

### Agent Skills for Construction
- The NHP agent *config* exists but the actual skills (read risk register, draft EWN, parse NEC4 clause) aren't implemented — agents would just be generic Claude sessions with a system prompt

### Cross-Project Synthesis
- RAG is per-project scoped. The cross-project precedent lookup described on the page isn't wired up

---

## Priority Order (for a GS demo)

1. **M365 OAuth + real SharePoint read** — without this nothing is real
2. **One working agent on NHP** — pick Risk Agent, give it one real skill, show it producing one real output
3. **Onboarding Agent** — even a simplified 5-question CLI flow would be impressive
4. **Document approval** — straightforward state machine, high visibility feature
5. Timesheets, calendar, cross-project RAG — after the above

The core engine is solid. The Microsoft integration layer is the critical path.
