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
        await this.store.upsertDocument({ ...doc, companyId: projectId });
      }
    }

    if (config.dataverse) {
      const dv = new DataverseIngestor(config.dataverse);
      const docs = await dv.fetchRecords();
      for (const doc of docs) {
        await this.store.upsertDocument({ ...doc, companyId: projectId });
      }
    }
  }

  /** Search across all projects or scoped to one */
  async search(
    query: string,
    options?: { companyId?: string; limit?: number },
  ): Promise<SearchResult[]> {
    return this.store.search(query, {
      companyId: options?.companyId,
      limit: options?.limit ?? 10,
    });
  }

  /** Cross-project pattern search */
  async findPrecedent(
    topic: string,
    options?: { excludeCompanyId?: string; limit?: number },
  ): Promise<SearchResult[]> {
    return this.store.search(topic, {
      excludeCompanyId: options?.excludeCompanyId,
      limit: options?.limit ?? 20,
    });
  }
}
