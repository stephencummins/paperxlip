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
      skills: (a.skills as string[]) ?? [],
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

  // Company readme — must be COMPANY.md (uppercase) for portability importer
  const companyPath = "COMPANY.md";
  const companyMd = buildCompanyMarkdown(raw);
  files[companyPath] = companyMd;

  // Agent markdown files — portability importer discovers agents/${slug}/AGENTS.md
  const paperclipAgentsConfig: Record<string, unknown> = {};
  for (const a of agents) {
    const agentName = a.name as string;
    const slug = slugify(agentName);
    files[`agents/${slug}/AGENTS.md`] = buildAgentMarkdown(a);
    paperclipAgentsConfig[slug] = {
      role: (a.role as string) ?? "agent",
      icon: (a.icon as string) ?? null,
      capabilities: (a.capabilities as string) ?? null,
      budgetMonthlyCents: (a.budgetMonthlyCents as number) ?? 3000,
      adapter: { type: (a.adapterType as string) ?? "claude_local" },
    };
  }

  // Projects from template JSON — importer discovers projects/${slug}/PROJECT.md
  const rawProjects = (raw.projects as Array<Record<string, unknown>>) ?? [];
  const projectSlugByName = new Map<string, string>();
  const paperclipProjectsConfig: Record<string, unknown> = {};
  for (const p of rawProjects) {
    const projectName = p.name as string;
    const slug = slugify(projectName);
    projectSlugByName.set(projectName, slug);
    const leadAgent = p.leadAgent as string | undefined;
    files[`projects/${slug}/PROJECT.md`] = buildProjectMarkdown(p);
    paperclipProjectsConfig[slug] = {
      leadAgentSlug: leadAgent ? slugify(leadAgent) : null,
      targetDate: (p.targetDate as string) ?? null,
      status: "active",
    };
  }

  // Issues from template JSON — importer discovers issues/${slug}/TASK.md
  const issuePrefix = (raw.issuePrefix as string) ?? "ISSUE";
  const rawIssues = (raw.issues as Array<Record<string, unknown>>) ?? [];
  const paperclipTasksConfig: Record<string, unknown> = {};
  rawIssues.forEach((iss, idx) => {
    const title = iss.title as string;
    const slug = (slugify(title).slice(0, 50) + `-${idx + 1}`);
    const identifier = `${issuePrefix}-${String(idx + 1).padStart(3, "0")}`;
    const assigneeAgent = iss.assigneeAgent as string | undefined;
    const projectName = iss.project as string | undefined;
    const projectSlug = projectName ? (projectSlugByName.get(projectName) ?? slugify(projectName)) : null;
    files[`issues/${slug}/TASK.md`] = buildIssueMarkdown(iss, projectSlug, assigneeAgent ? slugify(assigneeAgent) : null);
    paperclipTasksConfig[slug] = {
      identifier,
      status: (iss.status as string) ?? "backlog",
      priority: (iss.priority as string) ?? "medium",
    };
  });

  // .paperclip.yaml — extension data for agents, projects, tasks
  const paperclipYaml = buildPaperclipYaml({ agents: paperclipAgentsConfig, projects: paperclipProjectsConfig, tasks: paperclipTasksConfig });
  files[".paperclip.yaml"] = paperclipYaml;

  // The manifest passed here is informational; buildManifestFromPackageFiles
  // rebuilds it from the file tree when importing.
  const manifest: CompanyPortabilityManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: null,
    includes: { company: true, agents: true, projects: rawProjects.length > 0, issues: rawIssues.length > 0, skills: false },
    company: {
      path: companyPath,
      name,
      description,
      brandColor: null,
      logoPath: null,
      requireBoardApprovalForNewAgents: false,
    },
    agents: manifestAgents,
    skills: [],
    projects: [],
    issues: [],
    envInputs: [],
  };

  return { manifest, files };
}

function buildCompanyMarkdown(raw: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = raw.name as string;
  // Frontmatter required for portability importer to read name/description
  lines.push("---");
  lines.push(`name: "${name.replace(/"/g, '\\"')}"`);
  if (raw.description) lines.push(`description: "${String(raw.description).replace(/"/g, '\\"')}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${name}`);
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
  const reportsTo = agent.reportsTo as string | undefined;
  const skills = agent.skills as string[] | undefined;

  lines.push("---");
  lines.push(`name: ${name}`);
  if (title) lines.push(`title: ${title}`);
  if (reportsTo) lines.push(`reportsTo: "${slugify(reportsTo)}"`);
  if (skills?.length) lines.push(`skills: ${JSON.stringify(skills)}`);
  lines.push("---");
  lines.push("");

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

function buildProjectMarkdown(project: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = project.name as string;
  lines.push("---");
  lines.push(`name: ${name}`);
  if (project.description) lines.push(`description: "${String(project.description).replace(/"/g, '\\"')}"`);
  lines.push("---");
  lines.push("");
  if (project.description) lines.push(project.description as string);
  lines.push("");
  return lines.join("\n");
}

function buildIssueMarkdown(issue: Record<string, unknown>, projectSlug: string | null, assigneeSlug: string | null): string {
  const lines: string[] = [];
  const title = issue.title as string;
  lines.push("---");
  lines.push(`title: ${title}`);
  if (projectSlug) lines.push(`project: ${projectSlug}`);
  if (assigneeSlug) lines.push(`assignee: ${assigneeSlug}`);
  if (issue.status) lines.push(`status: ${issue.status}`);
  if (issue.priority) lines.push(`priority: ${issue.priority}`);
  lines.push("---");
  lines.push("");
  if (issue.description) lines.push(issue.description as string);
  lines.push("");
  return lines.join("\n");
}

function buildPaperclipYaml(config: { agents: Record<string, unknown>; projects: Record<string, unknown>; tasks: Record<string, unknown> }): string {
  const lines: string[] = [];
  const writeObj = (label: string, obj: Record<string, unknown>) => {
    if (Object.keys(obj).length === 0) return;
    lines.push(`${label}:`);
    for (const [key, val] of Object.entries(obj)) {
      lines.push(`  ${key}:`);
      if (val && typeof val === "object") {
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          if (v === null || v === undefined) continue;
          if (typeof v === "object") {
            lines.push(`    ${k}:`);
            for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
              if (v2 !== null && v2 !== undefined) lines.push(`      ${k2}: ${JSON.stringify(v2)}`);
            }
          } else {
            lines.push(`    ${k}: ${JSON.stringify(v)}`);
          }
        }
      }
    }
  };
  writeObj("agents", config.agents);
  writeObj("projects", config.projects);
  writeObj("tasks", config.tasks);
  return lines.join("\n") + "\n";
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
