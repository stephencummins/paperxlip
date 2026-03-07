interface MaceSearchResult {
  score: number;
  chunk: { id: string; documentId: string; projectId: string; content: string; chunkIndex: number; embedding: number[]; metadata: Record<string, unknown> };
  document: { id: string; projectId: string; sourceType: string; sourceUrl: string; title: string; content: string; mimeType: string; metadata: Record<string, unknown>; ingestedAt: Date; updatedAt: Date };
}

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-005:embedContent";

/**
 * VectorStore handles document chunk storage and semantic search.
 * Uses the Paperclip PostgreSQL instance directly via pg.
 * Embeddings stored as JSON text (embedding_json column).
 * Cosine similarity computed in JS until pgvector is available.
 */
export class VectorStore {
  private apiKey: string;
  private pool: any; // pg.Pool — imported dynamically to avoid ESM issues

  constructor(private dbUrl: string) {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!this.apiKey) {
      console.warn("[mace-context] GEMINI_API_KEY not set — embeddings will be empty");
    }
  }

  private async getPool() {
    if (!this.pool) {
      const pg = await import("pg");
      this.pool = new pg.default.Pool({ connectionString: this.dbUrl });
    }
    return this.pool;
  }

  /** Upsert a document: chunk it, embed it, store it */
  async upsertDocument(doc: {
    companyId: string;
    sourceType: string;
    sourceUrl: string;
    title: string;
    content: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ documentId: string; chunksCreated: number }> {
    const pool = await this.getPool();

    // Upsert document
    const docResult = await pool.query(
      `INSERT INTO mace_documents (company_id, source_type, source_url, title, content, mime_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_id, source_url) DO UPDATE SET
         title = EXCLUDED.title, content = EXCLUDED.content,
         metadata = EXCLUDED.metadata, updated_at = now()
       RETURNING id`,
      [
        doc.companyId,
        doc.sourceType,
        doc.sourceUrl,
        doc.title,
        doc.content,
        doc.mimeType ?? "text/plain",
        JSON.stringify(doc.metadata ?? {}),
      ],
    );
    const documentId = docResult.rows[0].id;

    // Delete old chunks
    await pool.query(`DELETE FROM mace_chunks WHERE document_id = $1`, [documentId]);

    // Chunk and embed
    const chunks = this.chunkDocument(doc.content);
    const embeddings = await this.embedChunks(chunks);

    // Insert chunks
    for (let i = 0; i < chunks.length; i++) {
      await pool.query(
        `INSERT INTO mace_chunks (document_id, company_id, content, chunk_index, embedding_json, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          documentId,
          doc.companyId,
          chunks[i],
          i,
          JSON.stringify(embeddings[i]),
          JSON.stringify({}),
        ],
      );
    }

    console.log(
      `[mace-context] Upserted ${chunks.length} chunks for "${doc.title}" (company: ${doc.companyId})`,
    );
    return { documentId, chunksCreated: chunks.length };
  }

  /** Semantic search across chunks using cosine similarity */
  async search(
    query: string,
    options: { companyId?: string; excludeCompanyId?: string; limit?: number },
  ): Promise<MaceSearchResult[]> {
    const pool = await this.getPool();
    const queryEmbedding = await this.embed(query);
    if (queryEmbedding.length === 0) return [];

    const limit = options.limit ?? 10;

    // Fetch chunks with their embeddings
    let sql = `
      SELECT mc.id, mc.document_id, mc.company_id, mc.content, mc.chunk_index,
             mc.embedding_json, mc.metadata,
             md.title AS doc_title, md.source_url, md.source_type, md.mime_type,
             md.content AS doc_content, md.metadata AS doc_metadata,
             md.ingested_at, md.updated_at
      FROM mace_chunks mc
      JOIN mace_documents md ON mc.document_id = md.id
      WHERE mc.embedding_json IS NOT NULL
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (options.companyId) {
      sql += ` AND mc.company_id = $${paramIdx++}`;
      params.push(options.companyId);
    }
    if (options.excludeCompanyId) {
      sql += ` AND mc.company_id != $${paramIdx++}`;
      params.push(options.excludeCompanyId);
    }

    const result = await pool.query(sql, params);

    // Compute cosine similarity in JS
    const scored = result.rows
      .map((row: any) => {
        const chunkEmbedding: number[] = JSON.parse(row.embedding_json);
        const score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
        return { row, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ row, score }: any) => ({
      score,
      chunk: {
        id: row.id,
        documentId: row.document_id,
        projectId: row.company_id,
        content: row.content,
        embedding: [],
        chunkIndex: row.chunk_index,
        metadata: row.metadata,
      },
      document: {
        id: row.document_id,
        projectId: row.company_id,
        sourceType: row.source_type,
        sourceUrl: row.source_url,
        title: row.doc_title,
        content: "", // Don't return full doc content in search results
        mimeType: row.mime_type,
        metadata: row.doc_metadata,
        ingestedAt: row.ingested_at,
        updatedAt: row.updated_at,
      },
    }));
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

  /** Embed a single text string via Gemini text-embedding-005 */
  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${GEMINI_EMBED_URL}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-005",
          content: { parts: [{ text }] },
        }),
      });
      if (!res.ok) {
        console.error(`[mace-context] Embed error: ${res.status} ${await res.text()}`);
        return [];
      }
      const data = await res.json();
      return data.embedding.values;
    } catch (err) {
      console.error("[mace-context] Embed failed:", err);
      return [];
    }
  }

  /** Embed multiple chunks in batch */
  private async embedChunks(chunks: string[]): Promise<number[][]> {
    // Process in batches of 5 to avoid rate limits
    const results: number[][] = [];
    for (let i = 0; i < chunks.length; i += 5) {
      const batch = chunks.slice(i, i + 5);
      const embeddings = await Promise.all(batch.map((c) => this.embed(c)));
      results.push(...embeddings);
    }
    return results;
  }

  /** Cosine similarity between two vectors */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}
