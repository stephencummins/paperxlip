import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CompanyPortabilityManifest,
  CompanyPortabilityAgentManifestEntry,
} from "@paperclipai/shared";
import { normalizeAgentUrlKey } from "@paperclipai/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  issuePrefix: string | null;
  contractType: string | null;
  agents: Array<{
    name: string;
    role: string;
    title: string | null;
    icon: string | null;
    reportsTo: string | null;
  }>;
}

export interface TemplateDetail extends TemplateSummary {
  raw: Record<string, unknown>;
  manifest: CompanyPortabilityManifest;
  files: Record<string, string>;
}

function slugify(name: string): string {
  return normalizeAgentUrlKey(name) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function templateToManifest(
  templateId: string,
  raw: Record<string, unknown>,
): { manifest: CompanyPortabilityManifest; files: Record<string, string> } {
  const agents = (raw.agents as Array<Record<string, unknown>>) ?? [];
  const name = (raw.name as string) ?? templateId;
  const description = (raw.description as string) ?? null;

  const manifestAgents: CompanyPortabilityAgentManifestEntry[] = agents.map((a) => {
    const agentName = a.name as string;
    const slug = slugify(agentName);
    const reportsTo = a.reportsTo as string | null;

    return {
      slug,
      name: agentName,
      path: `agents/${slug}.md`,
      role: (a.role as string) ?? "general",
      title: (a.title as string) ?? null,
      icon: (a.icon as string) ?? null,
      capabilities: (a.capabilities as string) ?? null,
      reportsToSlug: reportsTo ? slugify(reportsTo) : null,
      adapterType: (a.adapterType as string) ?? "claude_local",
      adapterConfig: (a.adapterConfig as Record<string, unknown>) ?? {},
      runtimeConfig: (a.runtimeConfig as Record<string, unknown>) ?? {},
      permissions: (a.permissions as Record<string, unknown>) ?? {},
      budgetMonthlyCents: (a.budgetMonthlyCents as number) ?? 3000,
      metadata: {
        skills: a.skills ?? [],
        ...(a.metadata as Record<string, unknown> ?? {}),
      },
    };
  });

  const files: Record<string, string> = {};

  // Company readme
  const companyPath = "company.md";
  const companyMd = buildCompanyMarkdown(raw);
  files[companyPath] = companyMd;

  // Agent markdown files (instructions / prompt context)
  for (const a of agents) {
    const agentName = a.name as string;
    const slug = slugify(agentName);
    const filePath = `agents/${slug}.md`;
    files[filePath] = buildAgentMarkdown(a);
  }

  const manifest: CompanyPortabilityManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: null,
    includes: { company: true, agents: true },
    company: {
      path: companyPath,
      name,
      description,
      brandColor: null,
      requireBoardApprovalForNewAgents: false,
    },
    agents: manifestAgents,
    requiredSecrets: [],
  };

  return { manifest, files };
}

function buildCompanyMarkdown(raw: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`# ${raw.name}`);
  lines.push("");
  if (raw.description) lines.push(raw.description as string);
  lines.push("");

  if (raw.contractType) lines.push(`**Contract Type:** ${raw.contractType}`);
  if (raw.client) lines.push(`**Client:** ${raw.client}`);
  if (raw.maceConsultRole) lines.push(`**Mace Consult Role:** ${raw.maceConsultRole}`);

  const frameworks = raw.regulatoryFramework as string[] | undefined;
  if (frameworks?.length) {
    lines.push(`**Regulatory Framework:** ${frameworks.join(", ")}`);
  }

  const goals = raw.goals as Array<Record<string, unknown>> | undefined;
  if (goals?.length) {
    lines.push("");
    lines.push("## Goals");
    lines.push("");
    for (const goal of goals) {
      lines.push(`### ${goal.title}`);
      if (goal.description) lines.push(goal.description as string);
      const children = goal.children as Array<Record<string, unknown>> | undefined;
      if (children?.length) {
        for (const child of children) {
          const assignee = child.assignee ? ` (${child.assignee})` : "";
          lines.push(`- **${child.title}**${assignee}: ${child.description ?? ""}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildAgentMarkdown(agent: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = agent.name as string;
  const title = agent.title as string | undefined;

  lines.push("---");
  lines.push(`name: ${name}`);
  if (title) lines.push(`title: ${title}`);
  if (agent.role) lines.push(`role: ${agent.role}`);
  if (agent.icon) lines.push(`icon: ${agent.icon}`);
  if (agent.reportsTo) lines.push(`reportsTo: ${agent.reportsTo}`);
  if (agent.budgetMonthlyCents) lines.push(`budgetMonthlyCents: ${agent.budgetMonthlyCents}`);
  const skills = agent.skills as string[] | undefined;
  if (skills?.length) lines.push(`skills: ${JSON.stringify(skills)}`);
  lines.push("---");
  lines.push("");

  // Prompt context becomes the markdown body (the agent's instructions)
  if (agent.promptContext) {
    lines.push(agent.promptContext as string);
    lines.push("");
  }

  if (agent.capabilities) {
    lines.push("## Capabilities");
    lines.push("");
    lines.push(agent.capabilities as string);
    lines.push("");
  }

  return lines.join("\n");
}

export function templateLibraryService() {
  return {
    async list(): Promise<TemplateSummary[]> {
      const entries = await fs.readdir(TEMPLATES_DIR);
      const templates: TemplateSummary[] = [];

      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        try {
          const content = await fs.readFile(path.join(TEMPLATES_DIR, entry), "utf-8");
          const raw = JSON.parse(content) as Record<string, unknown>;
          const agents = (raw.agents as Array<Record<string, unknown>>) ?? [];

          templates.push({
            id: entry.replace(".json", ""),
            name: (raw.name as string) ?? entry,
            description: (raw.description as string) ?? "",
            agentCount: agents.length,
            issuePrefix: (raw.issuePrefix as string) ?? null,
            contractType: (raw.contractType as string) ?? null,
            agents: agents.map((a) => ({
              name: a.name as string,
              role: (a.role as string) ?? "general",
              title: (a.title as string) ?? null,
              icon: (a.icon as string) ?? null,
              reportsTo: (a.reportsTo as string) ?? null,
            })),
          });
        } catch {
          // skip malformed templates
        }
      }

      return templates.sort((a, b) => b.agentCount - a.agentCount);
    },

    async get(templateId: string): Promise<TemplateDetail | null> {
      const filePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const raw = JSON.parse(content) as Record<string, unknown>;
        const agents = (raw.agents as Array<Record<string, unknown>>) ?? [];
        const { manifest, files } = templateToManifest(templateId, raw);

        return {
          id: templateId,
          name: (raw.name as string) ?? templateId,
          description: (raw.description as string) ?? "",
          agentCount: agents.length,
          issuePrefix: (raw.issuePrefix as string) ?? null,
          contractType: (raw.contractType as string) ?? null,
          agents: agents.map((a) => ({
            name: a.name as string,
            role: (a.role as string) ?? "general",
            title: (a.title as string) ?? null,
            icon: (a.icon as string) ?? null,
            reportsTo: (a.reportsTo as string) ?? null,
          })),
          raw,
          manifest,
          files,
        };
      } catch {
        return null;
      }
    },

    async toManifest(
      templateId: string,
    ): Promise<{ manifest: CompanyPortabilityManifest; files: Record<string, string> } | null> {
      const detail = await this.get(templateId);
      if (!detail) return null;
      return { manifest: detail.manifest, files: detail.files };
    },
  };
}
