import type { SearchResult } from "../types.js";
/**
 * VectorStore handles document chunk storage and semantic search.
 * Uses the Paperclip PostgreSQL instance directly via pg.
 * Embeddings stored as JSON text (embedding_json column).
 * Cosine similarity computed in JS until pgvector is available.
 */
export declare class VectorStore {
    private dbUrl;
    private apiKey;
    private pool;
    constructor(dbUrl: string);
    private getPool;
    /** Upsert a document: chunk it, embed it, store it */
    upsertDocument(doc: {
        companyId: string;
        sourceType: string;
        sourceUrl: string;
        title: string;
        content: string;
        mimeType?: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        documentId: string;
        chunksCreated: number;
    }>;
    /** Semantic search across chunks using cosine similarity */
    search(query: string, options: {
        companyId?: string;
        excludeCompanyId?: string;
        limit?: number;
    }): Promise<SearchResult[]>;
    /** Split document content into overlapping chunks */
    private chunkDocument;
    /** Embed a single text string via Gemini text-embedding-005 */
    embed(text: string): Promise<number[]>;
    /** Embed multiple chunks in batch */
    private embedChunks;
    /** Cosine similarity between two vectors */
    private cosineSimilarity;
}
//# sourceMappingURL=vector-store.d.ts.map