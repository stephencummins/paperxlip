import type { Document } from "../types.js";

interface SharePointConfig {
  siteUrl: string;
  driveIds?: string[];
  listIds?: string[];
}

/**
 * SharePointIngestor fetches documents from a SharePoint site via Microsoft Graph API.
 *
 * Supports:
 * - Document libraries (drives) — Word, Excel, PDF, etc.
 * - Lists — structured data as documents
 * - Delta sync — only fetch changed items since last ingest
 *
 * Auth: Azure AD app registration with Sites.Read.All (application permission)
 * or delegated auth via user token.
 */
export class SharePointIngestor {
  private config: SharePointConfig;
  private deltaTokens: Map<string, string> = new Map();

  constructor(config: SharePointConfig) {
    this.config = config;
  }

  /** Fetch all documents from configured drives and lists */
  async fetchDocuments(): Promise<Omit<Document, "id" | "projectId">[]> {
    const docs: Omit<Document, "id" | "projectId">[] = [];

    // Fetch from document libraries
    if (this.config.driveIds?.length) {
      for (const driveId of this.config.driveIds) {
        const driveDocs = await this.fetchDrive(driveId);
        docs.push(...driveDocs);
      }
    }

    // Fetch from lists
    if (this.config.listIds?.length) {
      for (const listId of this.config.listIds) {
        const listDocs = await this.fetchList(listId);
        docs.push(...listDocs);
      }
    }

    return docs;
  }

  /** Fetch items from a SharePoint document library */
  private async fetchDrive(driveId: string): Promise<Omit<Document, "id" | "projectId">[]> {
    // TODO: Microsoft Graph API call
    // GET /sites/{siteId}/drives/{driveId}/root/delta
    // - Uses delta token for incremental sync
    // - Downloads file content and extracts text
    // - Supports: .docx, .xlsx, .pptx, .pdf, .txt, .md
    //
    // const client = Client.init({ authProvider: ... });
    // const response = await client.api(`/drives/${driveId}/root/delta`).get();

    console.log(`[mace-context] SharePoint: fetching drive ${driveId} from ${this.config.siteUrl}`);
    return [];
  }

  /** Fetch items from a SharePoint list */
  private async fetchList(listId: string): Promise<Omit<Document, "id" | "projectId">[]> {
    // TODO: Microsoft Graph API call
    // GET /sites/{siteId}/lists/{listId}/items?expand=fields
    // - Converts list items to document format
    // - Each row becomes a document with field values as content

    console.log(`[mace-context] SharePoint: fetching list ${listId} from ${this.config.siteUrl}`);
    return [];
  }
}
