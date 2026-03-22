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

console.log("Seed: Mace Digital team ready");
console.log(`  Company: ${maceDig!.name} (${maceDig!.id})`);
console.log(`  Agents: 8 | Goals: 7 | Projects: 3 | Issues: 6`);

// =============================================================================
// Stephen8n.com — Stephen's personal app platform
// =============================================================================

const [s8n] = await db
  .insert(companies)
  .values({
    name: "Stephen8n",
    description:
      "stephen8n.com — Stephen Cummins's personal platform of AI-powered indie apps: Bookr (bookshelf scanner), Leaflet Tracker, MaceStyle (document compliance), SteVibe (vibe coding), and Paperxlip.",
    status: "active",
    budgetMonthlyCents: 25000,
  })
  .returning();

// Founder
const [s8nStephen] = await db
  .insert(agents)
  .values({
    companyId: s8n!.id,
    name: "Stephen",
    role: "ceo",
    title: "Founder",
    icon: "crown",
    status: "idle",
    adapterType: "claude_local",
    adapterConfig: { model: "claude-opus-4-6" },
    budgetMonthlyCents: 8000,
    permissions: { canCreateAgents: true },
    capabilities:
      "Product vision, app portfolio strategy, prioritisation, launch planning, user feedback triage",
  })
  .returning();

// Full-Stack Engineer
const [fullstack] = await db
  .insert(agents)
  .values({
    companyId: s8n!.id,
    name: "FullStack",
    role: "engineer",
    title: "Full-Stack Engineer",
    icon: "code",
    status: "idle",
    reportsTo: s8nStephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 6000,
    capabilities:
      "React, TypeScript, Tailwind, Node.js, Python, FastAPI, Cloudflare Workers, Docker, SQLite, PostgreSQL",
  })
  .returning();

// AI & Integrations Engineer
const [aiEng] = await db
  .insert(agents)
  .values({
    companyId: s8n!.id,
    name: "AIEngineer",
    role: "engineer",
    title: "AI & Integrations Engineer",
    icon: "brain",
    status: "idle",
    reportsTo: s8nStephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 5000,
    capabilities:
      "LLM integration (Claude, GPT-4o, Ollama), computer vision, RAG pipelines, Microsoft Graph API, Azure Functions, prompt engineering",
  })
  .returning();

// Growth & SEO
const [growth] = await db
  .insert(agents)
  .values({
    companyId: s8n!.id,
    name: "Growth",
    role: "cmo",
    title: "Growth & SEO",
    icon: "rocket",
    status: "idle",
    reportsTo: s8nStephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 3000,
    capabilities:
      "SEO optimisation, Google Search Console, sitemap generation, meta tags, structured data, content marketing, analytics, Google indexing",
  })
  .returning();

// DevOps
const [s8nDevops] = await db
  .insert(agents)
  .values({
    companyId: s8n!.id,
    name: "DevOps",
    role: "devops",
    title: "Infrastructure & Deployment",
    icon: "cog",
    status: "idle",
    reportsTo: s8nStephen!.id,
    adapterType: "claude_local",
    adapterConfig: { model: "claude-sonnet-4-6" },
    budgetMonthlyCents: 3000,
    capabilities:
      "Cloudflare Workers, Azure Functions, Docker, CI/CD, domain management, SSL, monitoring, cost optimisation",
  })
  .returning();

// --- Stephen8n Goals ---
const [s8nGoal] = await db
  .insert(goals)
  .values({
    companyId: s8n!.id,
    title: "App Portfolio Growth",
    description:
      "Build, ship, and grow stephen8n.com as a portfolio of useful AI-powered apps",
    level: "company",
    status: "active",
    ownerAgentId: s8nStephen!.id,
  })
  .returning();

await db.insert(goals).values([
  {
    companyId: s8n!.id,
    parentId: s8nGoal!.id,
    title: "Ship & Iterate Apps",
    description:
      "Feature development, bug fixes, improvements across Bookr, Leaflet Tracker, MaceStyle, SteVibe",
    level: "team" as const,
    status: "active" as const,
    ownerAgentId: fullstack!.id,
  },
  {
    companyId: s8n!.id,
    parentId: s8nGoal!.id,
    title: "AI Capabilities",
    description:
      "LLM integrations, vision features, RAG pipelines, prompt optimisation across the portfolio",
    level: "team" as const,
    status: "active" as const,
    ownerAgentId: aiEng!.id,
  },
  {
    companyId: s8n!.id,
    parentId: s8nGoal!.id,
    title: "Visibility & Growth",
    description:
      "Get indexed by Google, drive traffic, build audience for stephen8n.com and all apps",
    level: "team" as const,
    status: "active" as const,
    ownerAgentId: growth!.id,
  },
  {
    companyId: s8n!.id,
    parentId: s8nGoal!.id,
    title: "Infrastructure",
    description:
      "Deployment pipelines, hosting, monitoring, cost optimisation across Cloudflare/Azure/Docker",
    level: "team" as const,
    status: "active" as const,
    ownerAgentId: s8nDevops!.id,
  },
]);

// --- Stephen8n Projects ---
const [bookrProject] = await db
  .insert(projects)
  .values({
    companyId: s8n!.id,
    goalId: s8nGoal!.id,
    name: "Bookr (ShelfScan)",
    description:
      "AI-powered bookshelf cataloger — photo your shelf, get a searchable library. Python/FastAPI, GPT-4o/Ollama.",
    status: "in_progress",
    leadAgentId: fullstack!.id,
  })
  .returning();

const [stevibeProject] = await db
  .insert(projects)
  .values({
    companyId: s8n!.id,
    goalId: s8nGoal!.id,
    name: "SteVibe",
    description:
      "AI-powered web app generator on Cloudflare VibeSDK. React+TypeScript+Tailwind apps from natural language.",
    status: "in_progress",
    leadAgentId: fullstack!.id,
  })
  .returning();

await db.insert(projects).values([
  {
    companyId: s8n!.id,
    goalId: s8nGoal!.id,
    name: "MaceStyle",
    description:
      "Automated document validation — enforces writing style guide on SharePoint docs via Claude AI. Python/Azure Functions.",
    status: "in_progress",
    leadAgentId: aiEng!.id,
  },
  {
    companyId: s8n!.id,
    goalId: s8nGoal!.id,
    name: "Leaflet Tracker",
    description:
      "Location-based tracking app. JavaScript client/server.",
    status: "in_progress",
    leadAgentId: fullstack!.id,
  },
  {
    companyId: s8n!.id,
    goalId: s8nGoal!.id,
    name: "stephen8n.com",
    description:
      "The platform site itself — landing page, app directory, SEO, analytics.",
    status: "in_progress",
    leadAgentId: growth!.id,
  },
]);

// --- Stephen8n Starter Issues ---
await db.insert(issues).values([
  {
    companyId: s8n!.id,
    projectId: bookrProject!.id,
    goalId: s8nGoal!.id,
    title: "Get stephen8n.com indexed by Google",
    description:
      "stephen8n.com returns 403 to crawlers and is not indexed. Fix: ensure site is accessible to Googlebot, add sitemap.xml, submit to Google Search Console, add meta tags and structured data (JSON-LD), set up robots.txt.",
    status: "todo",
    priority: "critical",
    assigneeAgentId: growth!.id,
    createdByAgentId: s8nStephen!.id,
  },
  {
    companyId: s8n!.id,
    projectId: stevibeProject!.id,
    goalId: s8nGoal!.id,
    title: "Deploy SteVibe to production on Cloudflare Workers",
    description:
      "Set up production deployment for SteVibe (stevibe-prod repo). Configure Workers for Platforms, D1 database, R2 storage, AI Gateway. Domain: stevibe.stephen8n.com or similar.",
    status: "todo",
    priority: "high",
    assigneeAgentId: s8nDevops!.id,
    createdByAgentId: s8nStephen!.id,
  },
  {
    companyId: s8n!.id,
    projectId: bookrProject!.id,
    goalId: s8nGoal!.id,
    title: "Add Ollama local mode to Bookr for cost-free scanning",
    description:
      "Bookr supports GPT-4o but the Ollama/LLaVA backend needs testing and documentation. Ensure it works end-to-end for users who want free local inference.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: aiEng!.id,
    createdByAgentId: s8nStephen!.id,
  },
  {
    companyId: s8n!.id,
    projectId: bookrProject!.id,
    goalId: s8nGoal!.id,
    title: "Create landing pages for each app on stephen8n.com",
    description:
      "Each app (Bookr, SteVibe, MaceStyle, Leaflet Tracker) needs its own landing page with: description, screenshots, tech stack, try-it link. Good for SEO and discoverability.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: growth!.id,
    createdByAgentId: s8nStephen!.id,
  },
]);

console.log(`\nSeed: Stephen8n team ready`);
console.log(`  Company: ${s8n!.name} (${s8n!.id})`);
console.log(`  Agents: 5 | Goals: 5 | Projects: 5 | Issues: 4`);

console.log("\nSeed complete — both teams ready");
process.exit(0);
