import type { Document } from "../types.js";

interface DataverseConfig {
  environmentUrl: string;
  tables: string[];
}

/**
 * DataverseIngestor fetches records from Dataverse tables via OData API.
 *
 * For NHP this includes:
 * - Risk registers
 * - Issue logs
 * - Decision records
 * - Stakeholder information
 * - Programme milestones
 *
 * Auth: Azure AD app registration with Dataverse API permissions
 * (user_impersonation or application-level access).
 */
export class DataverseIngestor {
  private config: DataverseConfig;

  constructor(config: DataverseConfig) {
    this.config = config;
  }

  /** Fetch records from all configured tables */
  async fetchRecords(): Promise<Omit<Document, "id" | "projectId">[]> {
    const docs: Omit<Document, "id" | "projectId">[] = [];

    for (const table of this.config.tables) {
      const tableDocs = await this.fetchTable(table);
      docs.push(...tableDocs);
    }

    return docs;
  }

  /** Fetch all records from a Dataverse table */
  private async fetchTable(tableName: string): Promise<Omit<Document, "id" | "projectId">[]> {
    // TODO: Dataverse OData API call
    // GET {environmentUrl}/api/data/v9.2/{tableName}
    // - Paginates through all records
    // - Converts each record to a document
    // - Record fields become the document content (structured text)
    //
    // Example for risk register:
    //   Each risk becomes a document with title, description,
    //   probability, impact, mitigation, owner, status
    //
    // Headers: {
    //   Authorization: `Bearer ${token}`,
    //   'OData-MaxVersion': '4.0',
    //   'OData-Version': '4.0',
    //   Accept: 'application/json',
    //   Prefer: 'odata.include-annotations="*"'
    // }

    console.log(
      `[mace-context] Dataverse: fetching table ${tableName} from ${this.config.environmentUrl}`,
    );
    return [];
  }
}
