import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertBoard, getActorInfo } from "./authz.js";
import { companyPortabilityService, logActivity } from "../services/index.js";
import { templateLibraryService } from "../services/template-library.js";

export function templateRoutes(db: Db) {
  const router = Router();
  const templates = templateLibraryService();
  const portability = companyPortabilityService(db);

  // List available templates
  router.get("/", async (_req, res) => {
    const list = await templates.list();
    res.json(list);
  });

  // Get single template detail (includes manifest preview)
  router.get("/:templateId", async (req, res) => {
    const detail = await templates.get(req.params.templateId);
    if (!detail) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(detail);
  });

  // Preview applying a template (dry-run)
  router.post("/:templateId/preview", async (req, res) => {
    assertBoard(req);
    const converted = await templates.toManifest(req.params.templateId);
    if (!converted) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const companyName = req.body.companyName ?? converted.manifest.company?.name ?? req.params.templateId;

    const preview = await portability.previewImport({
      source: {
        type: "inline",
        manifest: converted.manifest,
        files: converted.files,
      },
      target: req.body.companyId
        ? { mode: "existing_company", companyId: req.body.companyId }
        : { mode: "new_company", newCompanyName: companyName },
      agents: "all",
      collisionStrategy: req.body.collisionStrategy ?? "rename",
    });

    res.json(preview);
  });

  // Apply a template (creates company + agents)
  router.post("/:templateId/apply", async (req, res) => {
    assertBoard(req);
    const converted = await templates.toManifest(req.params.templateId);
    if (!converted) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const companyName = req.body.companyName ?? converted.manifest.company?.name ?? req.params.templateId;
    const actorInfo = getActorInfo(req);

    const result = await portability.importBundle(
      {
        source: {
          type: "inline",
          manifest: converted.manifest,
          files: converted.files,
        },
        target: req.body.companyId
          ? { mode: "existing_company", companyId: req.body.companyId }
          : { mode: "new_company", newCompanyName: companyName },
        agents: req.body.agents ?? "all",
        collisionStrategy: req.body.collisionStrategy ?? "rename",
      },
      actorInfo.actorId,
    );

    logActivity(db, {
      companyId: result.company.id,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      action: "template_applied",
      entityType: "company",
      entityId: result.company.id,
      details: {
        templateId: req.params.templateId,
        agentsCreated: result.agents.filter((a) => a.action === "created").length,
      },
    });

    res.json(result);
  });

  return router;
}
