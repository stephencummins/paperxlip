import type { Document } from "../types.js";

interface SharePointConfig {
  siteUrl: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  driveIds?: string[];
  listIds?: string[];
}

/**
 * SharePointIngestor fetches documents from a SharePoint site via Microsoft Graph API.
 *
 * Auth: Pass an accessToken directly, or provide clientId/clientSecret/tenantId
 * for client-credentials flow (app registration with Sites.Read.All).
 *
 * Supported content:
 * - Document libraries (drives) — .docx, .xlsx, .pdf, .txt, .md, .pptx
 * - SharePoint lists — each row becomes a structured document
 * - Delta sync — remembers delta tokens to only fetch changes
 */
export class SharePointIngestor {
  private config: SharePointConfig;
  private deltaTokens: Map<string, string> = new Map();
  private _accessToken: string | null = null;

  constructor(config: SharePointConfig) {
    this.config = config;
  }

  /** Fetch all documents from configured drives and lists */
  async fetchDocuments(): Promise<Omit<Document, "id" | "projectId">[]> {
    await this.ensureToken();
    const docs: Omit<Document, "id" | "projectId">[] = [];

    const siteId = await this.resolveSiteId();
    if (!siteId) {
      console.error(`[mace-context] SharePoint: could not resolve site ID for ${this.config.siteUrl}`);
      return [];
    }

    // Fetch from document libraries
    const driveIds = this.config.driveIds ?? await this.listDriveIds(siteId);
    for (const driveId of driveIds) {
      const driveDocs = await this.fetchDrive(siteId, driveId);
      docs.push(...driveDocs);
    }

    // Fetch from lists
    const listIds = this.config.listIds ?? [];
    for (const listId of listIds) {
      const listDocs = await this.fetchList(siteId, listId);
      docs.push(...listDocs);
    }

    console.log(`[mace-context] SharePoint: ingested ${docs.length} documents from ${this.config.siteUrl}`);
    return docs;
  }

  /** Resolve SharePoint site ID from the site URL */
  private async resolveSiteId(): Promise<string | null> {
    try {
      const url = new URL(this.config.siteUrl);
      const hostname = url.hostname;
      const sitePath = url.pathname.replace(/\/$/, "");
      const endpoint = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
      const res = await this.graphGet(endpoint);
      return res?.id ?? null;
    } catch (err) {
      console.error("[mace-context] SharePoint: site resolution failed:", err);
      return null;
    }
  }

  /** List all drive IDs for a site */
  private async listDriveIds(siteId: string): Promise<string[]> {
    try {
      const res = await this.graphGet(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`
      );
      return (res?.value ?? []).map((d: any) => d.id);
    } catch {
      return [];
    }
  }

  /** Fetch items from a SharePoint document library using delta sync */
  private async fetchDrive(siteId: string, driveId: string): Promise<Omit<Document, "id" | "projectId">[]> {
    const cacheKey = `drive:${driveId}`;
    const deltaToken = this.deltaTokens.get(cacheKey);

    const deltaUrl = deltaToken
      ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/delta?$deltatoken=${deltaToken}`
      : `https://graph.microsoft.com/v1.0/drives/${driveId}/root/delta`;

    const docs: Omit<Document, "id" | "projectId">[] = [];
    let nextLink: string | null = deltaUrl;

    while (nextLink) {
      const page: any = await this.graphGet(nextLink);
      if (!page) break;

      for (const item of page.value ?? []) {
        // Skip folders and deleted items
        if (item.folder || item.deleted) continue;

        const ext = (item.name as string).split(".").pop()?.toLowerCase() ?? "";
        const supported = ["docx", "xlsx", "pptx", "pdf", "txt", "md"];
        if (!supported.includes(ext)) continue;

        const content = await this.downloadTextContent(driveId, item.id, ext);
        if (!content) continue;

        docs.push({
          sourceType: "sharepoint",
          sourceUrl: item.webUrl,
          title: item.name,
          content,
          mimeType: this.mimeForExt(ext),
          metadata: {
            driveId,
            itemId: item.id,
            lastModified: item.lastModifiedDateTime,
            size: item.size,
            author: item.lastModifiedBy?.user?.displayName,
            path: item.parentReference?.path,
          },
          ingestedAt: new Date(),
          updatedAt: new Date(item.lastModifiedDateTime ?? Date.now()),
        });
      }

      // Persist delta token for next sync
      if (page["@odata.deltaLink"]) {
        const token = new URL(page["@odata.deltaLink"]).searchParams.get("$deltatoken");
        if (token) this.deltaTokens.set(cacheKey, token);
        break;
      }
      nextLink = page["@odata.nextLink"] ?? null;
    }

    console.log(`[mace-context] SharePoint: fetched ${docs.length} files from drive ${driveId}`);
    return docs;
  }

  /** Fetch rows from a SharePoint list, each row as a document */
  private async fetchList(siteId: string, listId: string): Promise<Omit<Document, "id" | "projectId">[]> {
    const docs: Omit<Document, "id" | "projectId">[] = [];
    let url: string | null =
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=200`;

    // Get list display name
    let listName = listId;
    try {
      const meta = await this.graphGet(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}`);
      listName = meta?.displayName ?? listId;
    } catch { /* ignore */ }

    while (url) {
      const page: any = await this.graphGet(url);
      if (!page) break;

      for (const item of page.value ?? []) {
        const fields: Record<string, unknown> = item.fields ?? {};
        const title = String(fields["Title"] ?? fields["LinkTitle"] ?? fields["Name"] ?? item.id);

        // Convert fields to readable content
        const lines = Object.entries(fields)
          .filter(([k]) => !k.startsWith("_") && !k.startsWith("@") && k !== "id")
          .map(([k, v]) => `${k}: ${v != null ? String(v) : ""}`)
          .filter((l) => l.length < 500);

        const content = `# ${title}\n\nSource: ${listName}\n\n${lines.join("\n")}`;

        docs.push({
          sourceType: "sharepoint",
          sourceUrl: item.webUrl ?? `${this.config.siteUrl}/lists/${listId}/items/${item.id}`,
          title: `${listName}: ${title}`,
          content,
          mimeType: "text/plain",
          metadata: { listId, listName, itemId: item.id, fields: fields as Record<string, unknown> },
          ingestedAt: new Date(),
          updatedAt: new Date(item.lastModifiedDateTime ?? Date.now()),
        });
      }

      url = page["@odata.nextLink"] ?? null;
    }

    console.log(`[mace-context] SharePoint: fetched ${docs.length} items from list ${listName}`);
    return docs;
  }

  /** Download and extract text from a drive item */
  private async downloadTextContent(driveId: string, itemId: string, ext: string): Promise<string | null> {
    try {
      if (ext === "txt" || ext === "md") {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
          { headers: { Authorization: `Bearer ${this._accessToken}` } }
        );
        if (!res.ok) return null;
        return await res.text();
      }

      // For Office/PDF: use Graph's text extraction (convert to text)
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content?format=text`,
        { headers: { Authorization: `Bearer ${this._accessToken}` } }
      );
      if (res.ok) {
        const text = await res.text();
        return text.trim() || null;
      }

      // Fallback: return metadata only
      return `[Binary file: ${ext}]`;
    } catch {
      return null;
    }
  }

  /** Acquire or reuse an access token */
  private async ensureToken(): Promise<void> {
    if (this.config.accessToken) {
      this._accessToken = this.config.accessToken;
      return;
    }
    const { clientId, clientSecret, tenantId } = this.config;
    if (!clientId || !clientSecret || !tenantId) {
      console.warn("[mace-context] SharePoint: no auth config — set accessToken or clientId/clientSecret/tenantId");
      return;
    }

    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
        }),
      }
    );
    if (!res.ok) {
      console.error("[mace-context] SharePoint: token acquisition failed", await res.text());
      return;
    }
    const data = await res.json();
    this._accessToken = data.access_token;
  }

  /** Make a GET request to the Graph API */
  private async graphGet(url: string): Promise<any> {
    if (!this._accessToken) return null;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this._accessToken}` },
    });
    if (!res.ok) {
      console.error(`[mace-context] Graph GET ${url} → ${res.status}`);
      return null;
    }
    return res.json();
  }

  private mimeForExt(ext: string): string {
    const map: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
    };
    return map[ext] ?? "application/octet-stream";
  }
}
