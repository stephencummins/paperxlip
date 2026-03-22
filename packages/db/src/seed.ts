import { createDb } from "./client.js";
import {
  companies,
  agents,
  goals,
  projects,
  issues,
} from "./schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const db = createDb(url);

console.log("Seeding database...");

// --- Mace Digital: the team building Paperxlip ---
const [maceDig] = await db
  .insert(companies)
  .values({
    name: "Mace Digital",
    description:
      "Mace Digital — builds Paperxlip, the AI workforce platform for Mace Consult programme management. Part of Mace Consult (Goldman Sachs Alternatives majority stake, ~$1B revenue, 5,500 staff).",
    status: "active",
    budgetMonthlyCents: 45000,
  })
  .returning();

// CEO — Stephen's AI counterpart
const [stephen] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "Stephen",
    role: "ceo",
    title: "Head of Mace Digital",
    icon: "crown",
    status: "idle",
    adapterType: "claude_local",
    adapterConfig: { model: "claude-opus-4-6" },
    budgetMonthlyCents: 10000,
    permissions: { canCreateAgents: true },
    capabilities:
      "Strategic direction, stakeholder management, platform roadmap, agent team coordination, cross-project knowledge synthesis vision",
  })
  .returning();

// CTO — Platform Architect
const [architect] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "Architect",
    role: "cto",
    title: "Platform Architect",
    icon: "circuit-board",
    status: "idle",
    reportsTo: stephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-opus-4-6" },
    budgetMonthlyCents: 8000,
    permissions: { canCreateAgents: true },
    capabilities:
      "System architecture, API design, database schema, adapter framework, code review, security review",
  })
  .returning();

// Backend Engineer
const [platformEng] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "PlatformEngineer",
    role: "engineer",
    title: "Backend Engineer",
    icon: "terminal",
    status: "idle",
    reportsTo: architect!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 6000,
    capabilities:
      "Server-side development, REST API, Drizzle migrations, heartbeat engine, agent lifecycle, auth, task checkout, approvals",
  })
  .returning();

// Frontend Engineer
const [frontendEng] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "FrontendEngineer",
    role: "engineer",
    title: "Frontend Engineer",
    icon: "code",
    status: "idle",
    reportsTo: architect!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 5000,
    capabilities:
      "React dashboard, agent management UI, org chart visualisation, issue boards, real-time updates",
  })
  .returning();

// Knowledge Platform Engineer (Mace Context)
const [contextEng] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "ContextEngineer",
    role: "engineer",
    title: "Knowledge Platform Engineer",
    icon: "database",
    status: "idle",
    reportsTo: architect!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 6000,
    capabilities:
      "RAG pipeline, pgvector, SharePoint Graph API, Dataverse OData, document chunking, embeddings, semantic search, cross-project synthesis",
  })
  .returning();

// DevOps
const [devops] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "DevOps",
    role: "devops",
    title: "DevOps & Infrastructure",
    icon: "cog",
    status: "idle",
    reportsTo: architect!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 4000,
    capabilities:
      "CI/CD pipelines, Docker, deployment automation, monitoring, PostgreSQL admin, upstream sync with paperclipai/paperclip",
  })
  .returning();

// QA
const [qa] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "QA",
    role: "qa",
    title: "Quality Assurance",
    icon: "shield",
    status: "idle",
    reportsTo: architect!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 3000,
    capabilities:
      "Test strategy, integration testing, API testing, agent lifecycle testing, heartbeat validation, security testing",
  })
  .returning();

// Researcher
const [researcher] = await db
  .insert(agents)
  .values({
    companyId: maceDig!.id,
    name: "Researcher",
    role: "researcher",
    title: "Construction Domain Researcher",
    icon: "telescope",
    status: "idle",
    reportsTo: stephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 3000,
    capabilities:
      "Construction industry research, NEC4 analysis, regulatory tracking (CDM, Building Safety Act, RIBA, ISO 19650), competitive intelligence",
  })
  .returning();

// --- Goals ---
const [platformGoal] = await db
  .insert(goals)
  .values({
    companyId: maceDig!.id,
    title: "Platform Delivery",
    description:
      "Build and ship Paperxlip as Mace Digital's AI workforce platform for Mace Consult",
    level: "company",
    status: "active",
    ownerAgentId: stephen!.id,
  })
  .returning();

const goalChildren = [
  {
    title: "Core Platform",
    description:
      "Agent orchestration, heartbeats, task management, org charts, approvals",
    level: "team" as const,
    ownerAgentId: platformEng!.id,
  },
  {
    title: "Mace Context Layer",
    description:
      "RAG pipeline: SharePoint/Dataverse ingestion, vector search, cross-project knowledge synthesis",
    level: "team" as const,
    ownerAgentId: contextEng!.id,
  },
  {
    title: "Dashboard & UI",
    description:
      "React dashboard for agent management, monitoring, and project visibility",
    level: "team" as const,
    ownerAgentId: frontendEng!.id,
  },
  {
    title: "Infrastructure & Reliability",
    description: "CI/CD, deployment, monitoring, upstream sync, database ops",
    level: "team" as const,
    ownerAgentId: devops!.id,
  },
  {
    title: "Quality & Testing",
    description:
      "Test coverage, integration tests, security validation, regression prevention",
    level: "team" as const,
    ownerAgentId: qa!.id,
  },
  {
    title: "Domain Intelligence",
    description:
      "Construction industry knowledge, regulatory tracking, competitive analysis",
    level: "team" as const,
    ownerAgentId: researcher!.id,
  },
];

await db.insert(goals).values(
  goalChildren.map((g) => ({
    companyId: maceDig!.id,
    parentId: platformGoal!.id,
    status: "active" as const,
    ...g,
  })),
);

// --- Projects ---
const [coreProject] = await db
  .insert(projects)
  .values({
    companyId: maceDig!.id,
    goalId: platformGoal!.id,
    name: "Paperxlip Core",
    description:
      "Core platform: agent orchestration, heartbeats, task management, API, UI",
    status: "in_progress",
    leadAgentId: architect!.id,
  })
  .returning();

const [contextProject] = await db
  .insert(projects)
  .values({
    companyId: maceDig!.id,
    goalId: platformGoal!.id,
    name: "Mace Context",
    description:
      "Knowledge synthesis layer: RAG pipeline, SharePoint/Dataverse ingestion, vector search",
    status: "in_progress",
    leadAgentId: contextEng!.id,
  })
  .returning();

await db.insert(projects).values({
  companyId: maceDig!.id,
  goalId: platformGoal!.id,
  name: "Project Templates",
  description:
    "Pre-built agent team configurations for Mace Consult project types",
  status: "in_progress",
  leadAgentId: researcher!.id,
});

// --- Starter issues ---
await db.insert(issues).values([
  {
    companyId: maceDig!.id,
    projectId: coreProject!.id,
    goalId: platformGoal!.id,
    title: "Implement SharePoint ingestor via Microsoft Graph API",
    description:
      "Build out the SharePoint adapter in packages/mace-context/src/ingestors/sharepoint.ts — currently a stub. Needs: Graph API client, delta token handling for incremental sync, file download and text extraction, list item ingestion.",
    status: "todo",
    priority: "high",
    assigneeAgentId: contextEng!.id,
    createdByAgentId: stephen!.id,
  },
  {
    companyId: maceDig!.id,
    projectId: coreProject!.id,
    goalId: platformGoal!.id,
    title: "Implement Dataverse ingestor via OData API",
    description:
      "Build out packages/mace-context/src/ingestors/dataverse.ts — currently a stub. Needs: OData pagination, field-to-content mapping, record extraction for risk registers, decision logs, milestones.",
    status: "todo",
    priority: "high",
    assigneeAgentId: contextEng!.id,
    createdByAgentId: stephen!.id,
  },
  {
    companyId: maceDig!.id,
    projectId: contextProject!.id,
    goalId: platformGoal!.id,
    title: "Move cosine similarity to pgvector",
    description:
      "Vector search currently computes cosine similarity in JS. Move to pgvector's built-in <=> operator for performance at scale. Requires: pgvector extension, migration to add vector(768) column to mace_chunks, update search query.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: contextEng!.id,
    createdByAgentId: architect!.id,
  },
  {
    companyId: maceDig!.id,
    projectId: coreProject!.id,
    goalId: platformGoal!.id,
    title: "Set up CI/CD pipeline",
    description:
      "GitHub Actions workflow: lint, typecheck, test, build on PR. Deploy pipeline for staging. Docker build for production.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: devops!.id,
    createdByAgentId: architect!.id,
  },
  {
    companyId: maceDig!.id,
    projectId: coreProject!.id,
    goalId: platformGoal!.id,
    title: "Add integration tests for agent lifecycle",
    description:
      "Test the full agent flow: create → idle → checkout task → running → complete → idle. Cover: budget pause at 100%, terminated agent restrictions, 409 on double checkout, approval workflow for hires.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: qa!.id,
    createdByAgentId: architect!.id,
  },
  {
    companyId: maceDig!.id,
    projectId: coreProject!.id,
    goalId: platformGoal!.id,
    title: "Research AI agent adoption in UK construction PMOs",
    description:
      "Survey how other UK construction consultancies (Arup, Arcadis, Turner & Townsend, Gleeds) are using AI in programme management. Identify gaps Paperxlip can fill. Focus on: document management, risk, NEC contract admin, reporting.",
    status: "backlog",
    priority: "low",
    assigneeAgentId: researcher!.id,
    createdByAgentId: stephen!.id,
  },
]);

console.log("Seed complete — Mace Digital team ready");
console.log(`  Company: ${maceDig!.name} (${maceDig!.id})`);
console.log(`  Agents: 8 (Stephen → Architect → [Platform, Frontend, Context, DevOps, QA] + Researcher)`);
console.log(`  Goals: 7 (1 company + 6 team)`);
console.log(`  Projects: 3`);
console.log(`  Issues: 6 starter tasks`);
process.exit(0);
