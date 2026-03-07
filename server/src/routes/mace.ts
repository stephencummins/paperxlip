import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { VectorStore } from "../services/mace-store.js";

let store: VectorStore | null = null;

function getStore(): VectorStore {
  if (!store) {
    const dbUrl = process.env.DATABASE_URL ?? `postgres://paperclip:paperclip@localhost:54329/paperclip`;
    store = new VectorStore(dbUrl);
  }
  return store;
}

export function maceRoutes(_db: Db) {
  const router = Router();

  /**
   * POST /api/mace/ingest
   * Ingest a document into the Mace context layer.
   * Body: { companyId, sourceType, sourceUrl, title, content, mimeType?, metadata? }
   */
  router.post("/mace/ingest", async (req, res) => {
    const { companyId, sourceType, sourceUrl, title, content, mimeType, metadata } = req.body;
    if (!companyId || !sourceType || !sourceUrl || !title || !content) {
      res.status(400).json({ error: "Required: companyId, sourceType, sourceUrl, title, content" });
      return;
    }

    try {
      const result = await getStore().upsertDocument({
        companyId,
        sourceType,
        sourceUrl,
        title,
        content,
        mimeType,
        metadata,
      });
      res.json({ ok: true, ...result });
    } catch (err: any) {
      console.error("[mace] Ingest error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/mace/search?q=<query>&companyId=<optional>&limit=<optional>
   * Semantic search across all project knowledge.
   */
  router.get("/mace/search", async (req, res) => {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ error: "Required: q (search query)" });
      return;
    }

    const companyId = req.query.companyId as string | undefined;
    const excludeCompanyId = req.query.excludeCompanyId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      const results = await getStore().search(q, { companyId, excludeCompanyId, limit });
      res.json({
        query: q,
        results: results.map((r) => ({
          score: Math.round(r.score * 1000) / 1000,
          chunkContent: r.chunk.content,
          chunkIndex: r.chunk.chunkIndex,
          documentTitle: r.document.title,
          documentSource: r.document.sourceUrl,
          sourceType: r.document.sourceType,
          companyId: r.document.projectId,
        })),
        total: results.length,
      });
    } catch (err: any) {
      console.error("[mace] Search error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/mace/documents?companyId=<optional>
   * List ingested documents.
   */
  router.get("/mace/documents", async (req, res) => {
    const s = getStore();
    const pool = await (s as any).getPool();
    const companyId = req.query.companyId as string | undefined;

    let sql = `SELECT id, company_id, source_type, source_url, title, mime_type,
                      length(content) as content_length, metadata, ingested_at, updated_at
               FROM mace_documents`;
    const params: any[] = [];
    if (companyId) {
      sql += ` WHERE company_id = $1`;
      params.push(companyId);
    }
    sql += ` ORDER BY ingested_at DESC`;

    try {
      const result = await pool.query(sql, params);
      res.json({ documents: result.rows, total: result.rows.length });
    } catch (err: any) {
      console.error("[mace] Documents error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
