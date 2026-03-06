import type { SearchResult, ProjectConfig } from "./types.js";
import { VectorStore } from "./store/vector-store.js";
import { SharePointIngestor } from "./ingestors/sharepoint.js";
import { DataverseIngestor } from "./ingestors/dataverse.js";

/**
 * MaceContext is the synthesis layer across all project knowledge.
 *
 * It ingests documents from SharePoint, Dataverse, Teams, and email,
 * chunks and embeds them, and provides semantic search across all
 * projects or scoped to a single project.
 */
export class MaceContext {
  private store: VectorStore;
  private projects: Map<string, ProjectConfig> = new Map();

  constructor(private dbUrl: string) {
    this.store = new VectorStore(dbUrl);
  }

  /** Register a project's data sources */
  registerProject(config: ProjectConfig): void {
    this.projects.set(config.projectId, config);
  }

  /** Ingest all registered sources for a project */
  async ingestProject(projectId: string): Promise<void> {
    const config = this.projects.get(projectId);
    if (!config) throw new Error(`Project ${projectId} not registered`);

    if (config.sharepoint) {
      const sp = new SharePointIngestor(config.sharepoint);
      const docs = await sp.fetchDocuments();
      for (const doc of docs) {
        await this.store.upsertDocument({ ...doc, projectId });
      }
    }

    if (config.dataverse) {
      const dv = new DataverseIngestor(config.dataverse);
      const docs = await dv.fetchRecords();
      for (const doc of docs) {
        await this.store.upsertDocument({ ...doc, projectId });
      }
    }
  }

  /**
   * Search across all projects or scoped to one.
   * This is the core synthesis query — an agent asks a question
   * and gets back relevant chunks from any project's knowledge.
   */
  async search(
    query: string,
    options?: { projectId?: string; limit?: number },
  ): Promise<SearchResult[]> {
    return this.store.search(query, {
      projectId: options?.projectId,
      limit: options?.limit ?? 10,
    });
  }

  /**
   * Cross-project pattern search.
   * E.g. "contractor delay claims" returns precedent from every project.
   */
  async findPrecedent(
    topic: string,
    options?: { excludeProjectId?: string; limit?: number },
  ): Promise<SearchResult[]> {
    return this.store.search(topic, {
      excludeProjectId: options?.excludeProjectId,
      limit: options?.limit ?? 20,
    });
  }
}
