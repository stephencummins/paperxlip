-- Mace Context Layer: document ingestion and vector search
-- pgvector is optional — tables work without it, embeddings are stored as text fallback

CREATE TABLE IF NOT EXISTS "mace_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "source_type" text NOT NULL,
  "source_url" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "mime_type" text NOT NULL DEFAULT 'text/plain',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ingested_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "mace_docs_company_source_idx" ON "mace_documents" ("company_id", "source_type");
CREATE UNIQUE INDEX IF NOT EXISTS "mace_docs_source_url_idx" ON "mace_documents" ("company_id", "source_url");

CREATE TABLE IF NOT EXISTS "mace_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "mace_documents"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "content" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "embedding_json" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "mace_chunks_document_idx" ON "mace_chunks" ("document_id");
CREATE INDEX IF NOT EXISTS "mace_chunks_company_idx" ON "mace_chunks" ("company_id");

-- To enable vector search, run these manually when pgvector is available:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE mace_chunks ADD COLUMN embedding vector(768);
-- UPDATE mace_chunks SET embedding = embedding_json::vector WHERE embedding_json IS NOT NULL;
-- CREATE INDEX mace_chunks_embedding_idx ON mace_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
