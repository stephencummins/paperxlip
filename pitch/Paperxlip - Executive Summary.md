# Paperxlip — Executive Summary

**AI Workforce Orchestration for Programme Delivery**
Mace Digital | Mace Consult | March 2026 | Confidential

---

## The Problem

Every Mace Consult project is a knowledge silo. SharePoint sites, Dataverse tables, Teams threads, email chains — each holding fragments of institutional knowledge that no single person can synthesise. When senior programme staff rotate or leave, years of context disappear overnight. Lessons learned decks are written, filed, and never consulted again.

The fragility is not that the information doesn't exist. The fragility is in the **synthesis layer** — the human ability to read everything, connect everything, and remember everything. That layer doesn't scale.

## The Opportunity

Mace Consult has just become an independent company with Goldman Sachs Alternatives backing specifically for "digital tools that provide greater predictability, automation and control." This is the defining moment for Mace Digital's strategy.

The consulting firms that first make enterprise-scale project knowledge genuinely usable will establish a competitive moat that compounds with every engagement. Mace Consult sits on decades of programme delivery knowledge across hospitals, defence, transport, and data centres. None of our competitors — Turner & Townsend, Arcadis, Faithful+Gould — have an AI workforce capability. First mover advantage is available now.

## The Solution: Paperxlip

Paperxlip is an AI workforce orchestration platform built by Mace Digital. For each Mace Consult project, it deploys a team of AI agents that continuously monitor, analyse, and act on project data:

| Agent | Role |
|-------|------|
| **Programme Agent** | Coordinates all agents, produces weekly summaries, escalates to human SRO |
| **Risk Agent** | Monitors risk registers, flags emerging risks, finds precedent from other Mace projects |
| **Commercial Agent** | Tracks variations and compensation events, drafts contractual responses |
| **Compliance Agent** | Checks deliverables against RIBA stage gates, CDM, Building Safety Act |
| **Knowledge Agent** | Continuously ingests documents, maintains searchable project knowledge |

Underneath the agents sits the **Mace Context Layer** — a shared knowledge store that ingests documents from SharePoint, Dataverse, Teams, and email across every project. When an agent on NHP encounters a contractor delay claim, it can instantly find how similar claims were handled on three other hospital programmes. Knowledge learned once is applied everywhere.

## Business Value

- **Knowledge Continuity** — Senior staff rotate or leave. The knowledge stays. Zero institutional memory loss.
- **Cross-Project Precedent** — Risk patterns, commercial decisions, regulatory approaches — learned once, applied portfolio-wide.
- **Faster Mobilisation** — New projects deploy an AI team pre-loaded with Mace precedent. Weeks of ramp-up become hours.
- **Bid Intelligence** — Lessons from delivery feed directly into proposals. Win rates improve because bids are evidence-based.
- **Margin Protection** — AI agents catch contract and compliance issues that humans miss under workload pressure.

## What We've Built

A working prototype deployed in one day:

- Open-source orchestration engine with full dashboard (agent monitoring, cost tracking, audit logs)
- NHP configured as the first project with Programme Agent running on Claude (Anthropic)
- Project template system — define agent teams, org charts, goals, and data sources in a single config file
- Vector database schema for semantic search across all project knowledge (pgvector with HNSW indexing)
- SharePoint and Dataverse integration scaffolding via Microsoft Graph API

## What We Need

1. **Azure AD App Registration** — Microsoft Graph permissions (Sites.Read.All) and Dataverse API access to connect real project data
2. **Compute & API Budget** — Cloud hosting for the orchestration engine, vector database, and AI agent execution
3. **Pilot Sponsorship** — NHP as the first live deployment, with access to real SharePoint content and risk registers
4. **Mace Digital Resource** — 2–3 dedicated engineers for 3 months to move from prototype to production

## Why Now

- Mace Consult's independence is the strategic moment to define the digital platform
- Goldman Sachs's investment mandate explicitly includes digital tooling
- AI costs are falling 10x per year — what costs £50K/month today will cost £5K/month in 12 months
- No construction consultancy has this capability yet
- The compound advantage means the gap widens with every project delivered
- **The risk is not that this doesn't work. The risk is that someone else builds it first.**

---

*Stephen Cummins · Mace Digital · stephencummins@gmail.com*
