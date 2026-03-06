import type { Document, DocumentChunk, SearchResult } from "../types.js";

/**
 * VectorStore wraps pgvector for document chunk storage and retrieval.
 * Uses the same PostgreSQL instance as Paperclip's main database.
 *
 * Requires: CREATE EXTENSION IF NOT EXISTS vector;
 *
 * Schema (managed via Drizzle migration):
 *   mace_documents — full document metadata
 *   mace_chunks    — chunked text with embedding vector
 */
export class VectorStore {
  constructor(private dbUrl: string) {}

  /** Upsert a document: chunk it, embed it, store it */
  async upsertDocument(doc: Omit<Document, "id">): Promise<void> {
    const chunks = this.chunkDocument(doc.content);
    const embeddings = await this.embedChunks(chunks);

    // TODO: Drizzle insert into mace_documents + mace_chunks
    // ON CONFLICT (sourceUrl, projectId) DO UPDATE
    // Delete old chunks, insert new ones with fresh embeddings
    console.log(
      `[mace-context] Upserted ${chunks.length} chunks for "${doc.title}" in project ${doc.projectId}`,
    );
  }

  /** Semantic search across chunks */
  async search(
    query: string,
    options: { projectId?: string; excludeProjectId?: string; limit: number },
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(query);

    // TODO: pgvector cosine similarity search
    // SELECT *, 1 - (embedding <=> $1) AS score
    // FROM mace_chunks
    // WHERE ($2::uuid IS NULL OR project_id = $2)
    //   AND ($3::uuid IS NULL OR project_id != $3)
    // ORDER BY embedding <=> $1
    // LIMIT $4

    console.log(
      `[mace-context] Search: "${query}" (project: ${options.projectId ?? "all"}, limit: ${options.limit})`,
    );
    return [];
  }

  /** Split document content into overlapping chunks */
  private chunkDocument(content: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start += chunkSize - overlap;
    }
    return chunks;
  }

  /** Embed a single text string */
  private async embed(text: string): Promise<number[]> {
    // TODO: Call embedding API (Gemini text-embedding-005 or OpenAI text-embedding-3-small)
    // For now return empty — will wire up in next phase
    return [];
  }

  /** Embed multiple chunks in batch */
  private async embedChunks(chunks: string[]): Promise<number[][]> {
    return Promise.all(chunks.map((c) => this.embed(c)));
  }
}
