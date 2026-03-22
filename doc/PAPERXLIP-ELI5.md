# Paperxlip — Explain Like I'm 5

## The One-Liner

**Paperxlip is a company made of robots, and you're the boss.**

---

## The Analogy

Imagine you run a company. You have employees — a programme manager, a risk analyst, a writer, a musician, a campaign manager. Each one has a job title, a boss they report to, a budget, and tasks to do.

Now imagine every single one of those employees is an AI.

**Paperxlip is the office they all work in.**

It's the org chart. The task board. The budget tracker. The clock that wakes them up every hour and says "check if you have work to do." It's the building, the HR system, and the management layer — but for AI agents instead of people.

---

## What It Actually Does

```
You (the human boss)
  │
  ├── Create a "company" (a project or team)
  │
  ├── Hire "agents" (AI workers with job titles)
  │     Each agent has:
  │       • A name and role (e.g. "Risk Agent — Risk Analyst")
  │       • A boss they report to (org chart)
  │       • A monthly budget (how much AI they can use)
  │       • Skills and instructions (what they know, how they behave)
  │       • An adapter (how they run — Claude CLI, API call, etc.)
  │
  ├── Assign tasks (issues) to agents
  │     Tasks flow: Backlog → To Do → In Progress → Done
  │
  ├── Set goals for the company
  │     Goals cascade: Company → Team → Agent → Task
  │
  └── Watch from the dashboard
        • Who's working on what
        • How much it's costing
        • What's been completed
        • What needs your attention
```

---

## The Heartbeat

This is the clever bit.

Every agent has a **heartbeat** — a timer that goes off (say, every hour). When it ticks:

1. The agent wakes up
2. Checks its task list — "Do I have work?"
3. If yes, it picks up the task and does it
4. Reports back — "Here's what I did"
5. Goes back to sleep until the next heartbeat

You don't have to manually trigger anything. The agents work on their own schedule, like employees who check their inbox every morning.

---

## Your Two Teams

### Team 1: Mace Consult (8 agents)

This is your professional team for Mace work.

```
Digital Director (the boss)
├── Programme Agent — tracks milestones, flags slippage
│   ├── Risk Agent — watches risk registers, finds precedent
│   ├── Commercial Agent — manages NEC4 contracts, variations
│   └── Compliance Agent — checks RIBA, CDM, Building Safety Act
├── Knowledge Agent — ingests documents, answers questions
├── Platform Agent — builds Power Platform solutions
└── Insights Agent — creates Power BI dashboards
```

**What they'd do:** The Risk Agent could scan SharePoint every hour for new documents, flag emerging risks, and create tasks for the Programme Agent to review. The Commercial Agent could draft responses to contractor correspondence. The Knowledge Agent could answer questions like "How did we handle this risk on the Northern Metropolis project?"

### Team 2: Stephen8n (14 agents)

This is your everything-team for stephen8n.com.

```
Orchestrator (CEO — coordinates everything)
├── CTO — architecture decisions, code review
│   ├── Ops — pm2, Docker, Caddy, monitoring
│   ├── Builder — Portal, Admin, Brickr, new apps
│   ├── Librarian — claude-config, skills, Bookr, Sched
│   └── Mace Lead — bridges Mace work with infrastructure
│       ├── Risk Agent
│       └── Knowledge Agent
├── Author — Smee, Lemon Book, Imggen, Remotion
│   └── Storyteller — Sidhe, Purpoise (game worlds)
├── Musician (cu.ste) — Poemx, Custe Studio, Ukebook
├── MP — Roadie, SAM, Casewerk (campaign ops)
│   └── Judge — AILS, custody (legal analysis)
└── Trader — Gridbot (algorithmic trading)
```

**What they'd do:** The MP agent could check Casewerk every morning for new constituent cases, draft responses, and flag anything with legal complexity to the Judge. The Musician could generate a daily poem and feed it through Poemx to create a song. The Ops agent could monitor Uptime Kuma and create issues when services go down.

---

## How It's Different From Just Using Claude

| Without Paperxlip | With Paperxlip |
|---|---|
| You open Claude and type a prompt | Agents wake up on their own and check for work |
| One conversation at a time | 14 agents working in parallel |
| You have to remember what everyone's doing | Dashboard shows all activity in real time |
| No budget control | Monthly token budgets per agent, auto-pause at limit |
| No history | Full audit trail of every action |
| No structure | Org chart, goals, tasks, reporting hierarchy |
| You are the bottleneck | Agents coordinate with each other |

---

## The Templates

Templates are pre-configured teams you can deploy in one click.

Think of them like "starter packs" for different types of work:

| Template | Agents | For |
|----------|--------|-----|
| **Stephen8n — Full Stack** | 14 | Everything on stephen8n.com |
| **Mace Consult** | 8 | Professional Mace Digital work |
| **NHP** | 5 | New Hospital Programme specifically |
| **Generic Construction** | 3 | Any construction project (baseline) |

When you click "Apply" on a template, it creates:
- A new company with the right name and settings
- All the agents with their roles, titles, icons, and reporting hierarchy
- Each agent's instructions (what they know, how they behave)
- Goal hierarchies for the company
- Budget allocations

**From zero to a fully staffed AI company in one click.**

---

## The Governance Layer

Every agent's work is tracked. Every action is logged. You can:

- **Pause** any agent instantly
- **Review** what they did before approving
- **Set budgets** that auto-stop runaway spending
- **Require approval** before agents can hire new agents
- **See the full audit trail** of every decision

MaceStyle (the document validator) has also been tested against the **Microsoft Agent Governance Toolkit** — SOC 2, ISO 27001, and GDPR compliant.

---

## The 30-Second Pitch

> "I run 30+ web services. Instead of managing them all manually, I built an AI workforce — 14 agents organised in an org chart with budgets, tasks, and goals. A Campaign Director manages my election canvassing. A Music Producer generates daily songs. A Legal Analyst handles custody cases. An Ops agent monitors my infrastructure. They all wake up on a heartbeat, check their tasks, do their work, and report back. I just watch the dashboard."

---

## What's Next

1. **Activate heartbeats** — right now the agents exist but aren't running autonomously yet. Setting heartbeat intervals will bring them to life.
2. **Create initial tasks** — give each agent their first piece of work.
3. **Connect adapters** — point `claude_local` agents at the right working directories on the Mini.
4. **Watch the dashboard** — see them work.

---

*Built on [Paperclip](https://github.com/paperclipai/paperclip) (MIT). Forked as Paperxlip for Mace Digital.*
