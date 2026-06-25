# What's New in Paperxlip

*Last updated: 22 March 2026*

This document covers major features and improvements from the latest upstream merge (1,042 commits from Paperclip).

---

## Routines (Beta)

Scheduled, recurring agent tasks. Define a routine and Paperxlip will trigger it on a schedule — like cron jobs for your AI workforce.

- Create and manage routines from the new **Routines** page in the sidebar
- Each routine run creates a linked issue automatically
- Public trigger URLs for webhook-based activation
- Hardened dispatch permissions and auth

---

## Worktree Support

Isolated agent workspaces with full version control. Agents can work in separate git worktrees, and their changes can be reviewed and merged back.

- **Worktree history merge** — review and import agent work from worktrees
- **Source discovery commands** — find and list available worktrees
- **Project mapping prompts** — map worktree projects during import
- **Attachment and document import** — carry over files from worktree runs
- Issue titles in merge preview for easier review

---

## Plugin System

Extensible plugin architecture for adding custom capabilities to Paperxlip.

- **Plugin loader** — automatic discovery and initialization of plugins
- **Plugin tool dispatcher** — registered tools from plugins available to agents
- **Plugin settings** — per-plugin configuration UI
- **Plugin manager** — install, configure, and manage plugins from the dashboard
- Kitchen sink example plugin included

---

## Org Chart Improvements

- **Pure SVG renderer** — no Playwright browser needed for org chart generation
- **Twemoji support** — colourful emoji rendering in org chart nodes
- Multiple rendering styles available

---

## Company Portability Enhancements

- **Skill selection** — choose which skills to include in company export/import
- **Logo support** — company logos in portable packages
- **Project and issue portability** — export/import projects and issues alongside agents
- Improved collision handling and validation

---

## Developer Experience

- **Default agent instructions bundle** — new agents start with sensible defaults
- **Username log censoring** — configurable privacy for agent run logs
- **Guarded dev restart** — safer dev server restarts with state preservation
- **Managed agent home directories** — per-company isolation for Codex agents
- **CI/CD consolidation** — single PR workflow, e2e test suite, lockfile refresh automation

---

## Paperxlip-Specific Additions

These are custom to our fork, not from upstream Paperclip:

- **Template Library** — browse and apply pre-configured agent team templates from the UI
- **Documentation Viewer** — in-app markdown documentation browser
- **Mace Context** — knowledge ingestion, vector store, and RAG pipeline for cross-project intelligence
- **Mace Routes** — SharePoint/Dataverse integration for NHP programme data

---

## Migration Notes

- Database schema updated (migrations 0024–0043) — applied automatically on startup
- New adapter packages: `gemini-local`, `pi-local`, `openclaw-gateway`
- `drizzle-orm` peer dependency now wants ≥0.41.0 (currently 0.38.4 — works but shows warning)
- Plugin system initialises on startup even with no plugins installed (zero overhead)
