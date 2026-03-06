import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { maceDocuments } from "./mace_documents.js";
import { companies } from "./companies.js";

/**
 * Chunked and embedded document fragments for vector search.
 *
 * Requires: CREATE EXTENSION IF NOT EXISTS vector;
 *
 * The embedding column uses pgvector's vector type (1536 dimensions for
 * OpenAI text-embedding-3-small, or 768 for Gemini text-embedding-005).
 * We use a custom column type since Drizzle doesn't natively support pgvector.
 */
export const maceChunks = pgTable(
  "mace_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => maceDocuments.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    // pgvector embedding stored as text for now — will use vector type in migration SQL
    // The actual column type is vector(768) but Drizzle doesn't support it natively
    embeddingText: text("embedding_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("mace_chunks_document_idx").on(table.documentId),
    companyIdx: index("mace_chunks_company_idx").on(table.companyId),
  }),
);
