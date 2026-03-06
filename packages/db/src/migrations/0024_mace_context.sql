-- Mace Context Layer: document ingestion and vector search
-- Requires pgvector extension for embedding storage and similarity search

CREATE EXTENSION IF NOT EXISTS vector;

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
  "embedding" vector(768),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "mace_chunks_document_idx" ON "mace_chunks" ("document_id");
CREATE INDEX IF NOT EXISTS "mace_chunks_company_idx" ON "mace_chunks" ("company_id");

-- HNSW index for fast approximate nearest neighbour search on embeddings
-- cosine distance operator: <=>
CREATE INDEX IF NOT EXISTS "mace_chunks_embedding_idx" ON "mace_chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
