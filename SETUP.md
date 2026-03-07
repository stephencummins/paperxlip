# Paperxlip — Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9.15+ (`npm install -g pnpm`)
- Gemini API key (for embeddings)

## 1. Install & Run

```bash
cd ~/Projects/paperxlip
pnpm install
pnpm build
pnpm dev
```

Server starts on http://127.0.0.1:3100 (or next free port). Embedded PostgreSQL is created automatically — no external DB needed for local dev.

The first time you open the UI, the onboarding wizard walks you through creating a company and first agent.

## 2. Fix Agent Execution

If running Paperxlip from within a Claude Code session, agents will fail with "cannot launch inside another Claude Code session". The fix is already applied in the codebase (unsets `CLAUDECODE` env var in child processes), but you need to restart the dev server after building.

To test: go to the agent page, click **Retry** on the failed run, or click **Invoke** to trigger a new heartbeat.

## 3. Wire Up Embeddings

Create `.env` in the project root:

```bash
DATABASE_URL=postgres://paperclip:paperclip@localhost:54329/paperclip
PORT=3100
SERVE_UI=true
GEMINI_API_KEY=<your key from ~/secrets/api-keys/gemini.env>
```

Then implement the embedding call in `packages/mace-context/src/store/vector-store.ts`. Replace the `embed()` method:

```typescript
private async embed(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-005:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-005",
        content: { parts: [{ text }] },
      }),
    },
  );
  const data = await res.json();
  return data.embedding.values;
}
```

Gemini `text-embedding-005` returns 768-dimension vectors, which matches the `vector(768)` column in the migration.

## 4. Apply the Mace Context Migration

The migration should auto-apply on restart if using embedded Postgres. If not:

```bash
pnpm db:migrate
```

This creates:
- `mace_documents` — full document metadata
- `mace_chunks` — chunked text with `vector(768)` embedding column
- HNSW cosine similarity index for fast search

**Note:** pgvector extension must be available. The embedded Postgres that ships with Paperclip includes it. If using an external Postgres, run `CREATE EXTENSION IF NOT EXISTS vector;` manually.

## 5. Manual Document Ingest (Before Azure AD Access)

Until you get Graph API permissions for SharePoint, you can manually ingest documents. Add a route to `server/src/routes/index.ts` or use the existing API to POST documents:

```bash
# Example: ingest a document via curl
curl -X POST http://localhost:3100/api/mace/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "<NHP company UUID from the UI>",
    "sourceType": "manual",
    "sourceUrl": "manual://risk-register-q1-2026",
    "title": "NHP Risk Register Q1 2026",
    "content": "<paste document text here>"
  }'
```

You'll need to build this endpoint — it should:
1. Insert into `mace_documents`
2. Chunk the content (the `chunkDocument()` method already exists in vector-store.ts)
3. Embed each chunk via Gemini
4. Insert into `mace_chunks` with the embedding vector

## 6. Build the Search Endpoint

Add `GET /api/mace/search?q=<query>&companyId=<optional>`:

1. Embed the query using the same Gemini model
2. Run pgvector cosine similarity search:

```sql
SELECT mc.*, md.title, md.source_url,
       1 - (mc.embedding <=> $1::vector) AS score
FROM mace_chunks mc
JOIN mace_documents md ON mc.document_id = md.id
WHERE ($2::uuid IS NULL OR mc.company_id = $2)
ORDER BY mc.embedding <=> $1::vector
LIMIT $3
```

3. Return results with score, chunk content, and source document metadata.

## 7. Cross-Project Demo

1. Create a second company in the UI (e.g. "Midlands Hospital Programme")
2. Ingest a few documents into each company — risk registers, commercial letters, meeting notes
3. Search from one project without filtering by `companyId`
4. Results come back from both projects — that's the cross-project precedent

## 8. Deploy a Template (TODO)

Once the template CLI is built:

```bash
pnpm paperxlip deploy-template nhp
```

Reads `templates/nhp.json` and creates the company, all 5 agents, org chart, and goals via the API.

## 9. SharePoint Integration (Needs Azure AD)

When you have an Azure AD app registration with `Sites.Read.All`:

1. Add credentials to `.env`:
   ```
   AZURE_TENANT_ID=<tenant>
   AZURE_CLIENT_ID=<app id>
   AZURE_CLIENT_SECRET=<secret>
   ```

2. Update `packages/mace-context/src/ingestors/sharepoint.ts` to use `@microsoft/microsoft-graph-client` with `@azure/identity` for auth

3. Configure the SharePoint site URL and drive/list IDs in the project template or via the UI

4. The Knowledge Agent triggers ingest on its heartbeat schedule — new documents are automatically chunked, embedded, and searchable

## Project Structure

```
server/src/
  adapters/          Agent adapters (Claude, Codex, process, HTTP)
  routes/            REST API endpoints
  services/          Business logic (heartbeat, agents, companies)
packages/
  db/src/schema/     Drizzle schema (including mace_documents, mace_chunks)
  db/src/migrations/ SQL migrations (0024_mace_context.sql)
  mace-context/src/  Knowledge layer (context, vector store, ingestors)
templates/           Project templates (nhp.json, generic-construction.json)
pitch/               CXO deck and executive summary
ui/                  React dashboard
```

## Useful Commands

```bash
pnpm dev              # Start everything (API + UI)
pnpm build            # Build all packages
pnpm test:run         # Run tests
pnpm db:migrate       # Apply pending migrations
pnpm typecheck        # TypeScript validation
```

## Ports

- Paperxlip API + UI: 3100 (or next free)
- Embedded PostgreSQL: 54329
