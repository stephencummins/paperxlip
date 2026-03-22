import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../../../doc");

export function docsRoutes() {
  const router = Router();

  // List available docs
  router.get("/api/docs", async (_req, res) => {
    try {
      const entries = await fs.readdir(DOCS_DIR);
      const docs = entries
        .filter((e) => e.endsWith(".md"))
        .map((e) => ({
          id: e.replace(".md", ""),
          filename: e,
          name: e
            .replace(".md", "")
            .replace(/-/g, " ")
            .replace(/^([A-Z]+)(\s)/, "$1:$2"),
        }))
        .sort((a, b) => {
          // Put ELI5 first, then alphabetical
          if (a.id === "PAPERXLIP-ELI5") return -1;
          if (b.id === "PAPERXLIP-ELI5") return 1;
          return a.name.localeCompare(b.name);
        });
      res.json(docs);
    } catch {
      res.json([]);
    }
  });

  // Get single doc content
  router.get("/api/docs/:docId", async (req, res) => {
    const docId = req.params.docId;
    if (docId.includes("..") || docId.includes("/")) {
      res.status(400).json({ error: "Invalid doc ID" });
      return;
    }
    const filePath = path.join(DOCS_DIR, `${docId}.md`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      res.json({ id: docId, content });
    } catch {
      res.status(404).json({ error: "Doc not found" });
    }
  });

  return router;
}
