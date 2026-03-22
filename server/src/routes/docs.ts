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
    // Prevent path traversal
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

  // Serve the docs viewer HTML page
  router.get("/docs", (_req, res) => {
    res.send(docsViewerHtml());
  });
  router.get("/docs/:docId", (_req, res) => {
    res.send(docsViewerHtml());
  });

  return router;
}

function docsViewerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paperxlip — Documentation</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e4e4e7; display: flex; min-height: 100vh; }
    nav { width: 240px; border-right: 1px solid #27272a; padding: 16px; flex-shrink: 0; overflow-y: auto; }
    nav h2 { font-size: 14px; font-weight: 600; color: #a1a1aa; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    nav a { display: block; padding: 6px 10px; border-radius: 6px; font-size: 13px; color: #d4d4d8; text-decoration: none; margin-bottom: 2px; transition: background 0.15s; }
    nav a:hover { background: #27272a; }
    nav a.active { background: #3f3f46; color: #fff; font-weight: 500; }
    main { flex: 1; padding: 32px 48px; max-width: 860px; overflow-y: auto; }
    .loading { color: #71717a; font-size: 14px; padding: 40px; }

    /* Markdown styles */
    main h1 { font-size: 28px; font-weight: 700; margin-bottom: 16px; color: #fff; border-bottom: 1px solid #27272a; padding-bottom: 12px; }
    main h2 { font-size: 22px; font-weight: 600; margin-top: 32px; margin-bottom: 12px; color: #f4f4f5; }
    main h3 { font-size: 17px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: #e4e4e7; }
    main p { font-size: 15px; line-height: 1.7; margin-bottom: 12px; color: #d4d4d8; }
    main ul, main ol { margin-bottom: 12px; padding-left: 24px; }
    main li { font-size: 15px; line-height: 1.7; margin-bottom: 4px; color: #d4d4d8; }
    main strong { color: #fff; }
    main em { color: #a1a1aa; }
    main code { background: #27272a; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace; color: #a78bfa; }
    main pre { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 16px; overflow-x: auto; }
    main pre code { background: none; padding: 0; color: #d4d4d8; font-size: 13px; }
    main blockquote { border-left: 3px solid #a78bfa; padding-left: 16px; margin-bottom: 12px; color: #a1a1aa; }
    main table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
    main th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #3f3f46; color: #a1a1aa; font-weight: 600; }
    main td { padding: 8px 12px; border-bottom: 1px solid #27272a; }
    main hr { border: none; border-top: 1px solid #27272a; margin: 24px 0; }
    main a { color: #818cf8; text-decoration: none; }
    main a:hover { text-decoration: underline; }
    main img { max-width: 100%; border-radius: 8px; }

    @media (max-width: 768px) {
      body { flex-direction: column; }
      nav { width: 100%; border-right: none; border-bottom: 1px solid #27272a; display: flex; gap: 4px; flex-wrap: wrap; padding: 8px; }
      nav h2 { display: none; }
      main { padding: 16px; }
    }
  </style>
</head>
<body>
  <nav id="sidebar">
    <h2>Documentation</h2>
    <div class="loading">Loading...</div>
  </nav>
  <main id="content">
    <div class="loading">Select a document from the sidebar.</div>
  </main>

  <script>
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    let docs = [];

    async function loadDocList() {
      const res = await fetch('/api/docs');
      docs = await res.json();
      const heading = sidebar.querySelector('h2');
      sidebar.innerHTML = '';
      sidebar.appendChild(heading);
      docs.forEach(doc => {
        const a = document.createElement('a');
        a.href = '/docs/' + doc.id;
        a.textContent = doc.name;
        a.dataset.id = doc.id;
        a.onclick = (e) => { e.preventDefault(); loadDoc(doc.id); };
        sidebar.appendChild(a);
      });

      // Load doc from URL or default to first
      const pathDoc = location.pathname.replace('/docs/', '').replace('/docs', '');
      if (pathDoc && docs.find(d => d.id === pathDoc)) {
        loadDoc(pathDoc);
      } else if (docs.length > 0) {
        loadDoc(docs[0].id);
      }
    }

    async function loadDoc(docId) {
      // Update active state
      sidebar.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.dataset.id === docId));
      history.replaceState(null, '', '/docs/' + docId);

      content.innerHTML = '<div class="loading">Loading...</div>';
      const res = await fetch('/api/docs/' + docId);
      const data = await res.json();
      content.innerHTML = marked.parse(data.content);
    }

    loadDocList();
  </script>
</body>
</html>`;
}
