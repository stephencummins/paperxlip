/** A document ingested from any source */
export interface Document {
    id: string;
    projectId: string;
    sourceType: "sharepoint" | "dataverse" | "email" | "teams" | "manual";
    sourceUrl: string;
    title: string;
    content: string;
    mimeType: string;
    metadata: Record<string, unknown>;
    ingestedAt: Date;
    updatedAt: Date;
}
/** A chunked + embedded fragment of a document */
export interface DocumentChunk {
    id: string;
    documentId: string;
    projectId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
    metadata: Record<string, unknown>;
}
/** Result of an ingest operation */
export interface IngestResult {
    documentsIngested: number;
    documentsUpdated: number;
    documentsSkipped: number;
    errors: {
        sourceUrl: string;
        error: string;
    }[];
}
/** Result of a semantic search */
export interface SearchResult {
    chunk: DocumentChunk;
    score: number;
    document: Document;
}
/** Configuration for a project's data sources */
export interface ProjectConfig {
    projectId: string;
    projectName: string;
    sharepoint?: {
        siteUrl: string;
        driveIds?: string[];
        listIds?: string[];
    };
    dataverse?: {
        environmentUrl: string;
        tables: string[];
    };
    ingestScheduleCron?: string;
}
//# sourceMappingURL=types.d.ts.map