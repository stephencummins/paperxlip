import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { cn, issueUrl } from "../lib/utils";
import { BookOpen } from "lucide-react";
import type { Issue } from "@paperclipai/shared";

/**
 * How to use: the seven-stage process as steps you can follow while doing
 * them. Each step finds its gate issue in the chosen project and lights up
 * when that gate is done. Modelled on the docked guide in Mic Gnome.
 */
interface Step {
  /** Title prefix of the issue that represents this step. */
  match: string;
  title: string;
  where: string;
  body: string;
  artefact: string;
}

const STEPS: Step[] = [
  {
    match: "Controls in place",
    title: "Put the controls in first",
    where: "the repo, once",
    artefact: "branch protection, hooks, .gitignore, budgets",
    body: "Before any agent runs: main only takes pull requests and the author is never the approver; hooks in .claude/settings.json block anything that changes a running machine; the .gitignore covers fixtures and client material; every agent has a monthly budget. These are the guard rails, so they go in before the road is used.",
  },
  {
    match: "Gate 1",
    title: "Say what you want",
    where: "Gate 1 issue, Originator Agent",
    artefact: "intent.md",
    body: "A request, a bug or a monitoring finding becomes intent.md: the problem, the outcome you want, who and what it touches, the constraints, the open questions. The agent drafts it. You read it, correct it and merge it. Merging is the acceptance; nothing else counts.",
  },
  {
    match: "Gate 2",
    title: "Draw the envelope",
    where: "Gate 2 issue, Assessment Agent",
    artefact: "ai-risk-assessment.md",
    body: "One page: what data is in scope and whose it is, where model calls go, and the envelope the agents must stay inside: data, tools, users, writes, model version, money per month. It also names the safe state and pre-authorises rolling back to it. Nothing is designed until this is merged, and this is the only gate that can widen the envelope later.",
  },
  {
    match: "Gate 3",
    title: "Agree the shape",
    where: "Gate 3 issue, Design Agent",
    artefact: "spec.md",
    body: "Behaviour, interfaces and acceptance criteria a test can check, written inside the envelope. The tool allow-list and what gets logged and kept live here too. Concerns are flagged in the document rather than quietly resolved. You approve the commit.",
  },
  {
    match: "Gate 4",
    title: "Correct the plan, then let it build",
    where: "Gate 4 issue, Build Agent",
    artefact: "plan.md, then pull requests",
    body: "Before code, plan.md: which files change, in what order, the risks, and the proof that will show it works. You correct it. Then the agent builds in its own worktree on a branch and lands every change as a pull request with tests. Every deployable is a tag, because a thing without a version cannot be rolled back.",
  },
  {
    match: "Gate 5",
    title: "Let the review run",
    where: "Gate 5 issue, Verification Agent",
    artefact: "CI status and REVIEW.md",
    body: "On every pull request: the tests, the regression fixtures, conformance to the spec and to the envelope, a scan for secrets and for client material that should be gitignored. Nobody approves this gate. Findings inform, and a failing review blocks the merge.",
  },
  {
    match: "Gate 6",
    title: "Merge and deploy it yourself",
    where: "Gate 6 issue, Release Agent",
    artefact: "tag, release notes, rollback command",
    body: "The agent prepares the release: the tag, the notes, the exact deploy command, the rollback command, and the traps that apply on this estate. You merge and you run the deploy. Agents never touch pm2, Caddy, cloudflared, Azure or Cloudflare, and never import into a tenant.",
  },
  {
    match: "Gate 7",
    title: "Watch the bands",
    where: "Gate 7 issue, Maintain Agent",
    artefact: "bands.yaml, then a new intent.md",
    body: "bands.yaml says what normal looks like: cost, errors, drift, the envelope. When a band is crossed the agent diagnoses and drafts a new intent.md for you to triage. Nothing is fixed directly; it re-enters at step two. A crossed envelope stops the offending agent.",
  },
];

/* ---------- one drawing per step ---------- */

const W = 220;
const H = 96;
const ink = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const soft = { fill: "none", stroke: "currentColor", strokeWidth: 1, opacity: 0.35 };

function Frame({ children, label, lit }: { children: ReactNode; label: string; lit: boolean }) {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}
      className={cn("block h-auto w-full max-w-[220px] shrink-0 rounded-md border border-border bg-background transition-colors",
        lit ? "text-primary" : "text-muted-foreground")}>
      {children}
    </svg>
  );
}

function Doc({ x, y, w = 52, h = 64, lines = 4, accent = false }: { x: number; y: number; w?: number; h?: number; lines?: number; accent?: boolean }) {
  return (
    <g>
      <path d={`M${x} ${y} h${w - 12} l12 12 v${h - 12} h-${w} z`} {...(accent ? ink : soft)} />
      {Array.from({ length: lines }, (_, i) => (
        <line key={i} x1={x + 9} y1={y + 22 + i * 9} x2={x + w - 9 - (i === lines - 1 ? 14 : 0)} y2={y + 22 + i * 9} {...soft} />
      ))}
    </g>
  );
}

const PICTURES: ((lit: boolean) => ReactNode)[] = [
  // 0 controls: a rail with three posts, a gate closed across the road.
  (lit) => (
    <Frame lit={lit} label="a road with guard rails and a closed gate">
      <line x1="16" y1="72" x2="204" y2="72" {...soft} />
      <line x1="16" y1="30" x2="204" y2="30" {...soft} />
      {[40, 110, 180].map((x) => <line key={x} x1={x} y1="24" x2={x} y2="78" {...ink} />)}
      <rect x="70" y="38" width="80" height="26" rx="2" {...ink} />
      {["PR", "hooks", "budget"].map((t, i) => (
        <text key={t} x={40 + i * 70} y="90" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">{t}</text>
      ))}
    </Frame>
  ),
  // 1 intent: a question mark becoming a document.
  (lit) => (
    <Frame lit={lit} label="a question turning into a document">
      <text x="44" y="64" textAnchor="middle" fontSize="44" fontFamily="ui-serif, serif" fill="currentColor" opacity="0.5">?</text>
      <polyline points="78,48 118,48 112,42" {...ink} />
      <polyline points="118,48 112,54" {...ink} />
      <Doc x={140} y={16} accent />
      <text x="166" y="92" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">intent.md</text>
    </Frame>
  ),
  // 2 envelope: a box with six labelled sides, the only thing that bounds the rest.
  (lit) => (
    <Frame lit={lit} label="a box labelled with the six axes of the envelope">
      <rect x="62" y="20" width="96" height="56" rx="3" {...ink} />
      <text x="110" y="52" textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace" fill="currentColor">envelope</text>
      {[["data", 110, 14], ["tools", 110, 88], ["users", 38, 50], ["writes", 182, 50], ["model", 38, 24], ["cost", 182, 24]].map(([t, x, y]) => (
        <text key={String(t)} x={Number(x)} y={Number(y)} textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">{t}</text>
      ))}
    </Frame>
  ),
  // 3 spec: a document with ticked acceptance criteria.
  (lit) => (
    <Frame lit={lit} label="a document with checkbox acceptance criteria">
      <Doc x={40} y={14} w={60} h={68} lines={0} accent />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="49" y={34 + i * 12} width="7" height="7" {...soft} />
          <line x1="61" y1={37.5 + i * 12} x2={88 - (i % 2) * 8} y2={37.5 + i * 12} {...soft} />
        </g>
      ))}
      <polyline points="50,37 52,40 56,34" {...ink} />
      <polyline points="50,49 52,52 56,46" {...ink} />
      <text x="150" y="52" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">a test can check it</text>
    </Frame>
  ),
  // 4 build: plan, then a branch merging into main by PR.
  (lit) => (
    <Frame lit={lit} label="a plan, then a branch merging into main">
      <Doc x={18} y={18} w={40} h={50} lines={3} />
      <line x1="80" y1="70" x2="204" y2="70" {...soft} />
      <path d="M100 70 C 120 70, 120 34, 140 34 L 164 34 C 184 34, 184 70, 196 70" {...ink} />
      {[100, 140, 164, 196].map((x, i) => <circle key={x} cx={x} cy={i === 0 || i === 3 ? 70 : 34} r="3" fill="currentColor" />)}
      <text x="152" y="24" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">branch</text>
      <text x="192" y="86" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">main</text>
    </Frame>
  ),
  // 5 test: a PR card with checks, one failing, holding the merge.
  (lit) => (
    <Frame lit={lit} label="a pull request with checks, one of them failing">
      <rect x="30" y="18" width="160" height="60" rx="3" {...soft} />
      {["tests", "fixtures", "spec", "secrets"].map((t, i) => (
        <g key={t}>
          <text x="42" y={34 + i * 12} fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">{t}</text>
          {i !== 2 ? <polyline points={`150,${31 + i * 12} 153,${34 + i * 12} 158,${28 + i * 12}`} {...ink} />
                   : <g><line x1="150" y1={28 + i * 12} x2="158" y2={36 + i * 12} {...ink} /><line x1="158" y1={28 + i * 12} x2="150" y2={36 + i * 12} {...ink} /></g>}
        </g>
      ))}
      <text x="110" y="92" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">a failing check blocks the merge</text>
    </Frame>
  ),
  // 6 deploy: a tag, a hand on the switch, a machine.
  (lit) => (
    <Frame lit={lit} label="a tagged release, a human at the switch, a machine">
      <path d="M24 30 h40 l14 14 l-14 14 h-40 z" {...ink} />
      <circle cx="34" cy="44" r="2.5" fill="currentColor" />
      <text x="48" y="47" fontSize="8" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.8">v1.1</text>
      <line x1="84" y1="44" x2="124" y2="44" {...soft} />
      <circle cx="140" cy="30" r="6" {...ink} />
      <path d="M130 58 q10 -14 20 0" {...ink} />
      <rect x="164" y="26" width="36" height="36" rx="3" {...soft} />
      <rect x="172" y="34" width="20" height="12" {...soft} />
      <text x="140" y="90" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">you press the button</text>
    </Frame>
  ),
  // 7 maintain: a band chart, the line crossing, an arrow back.
  (lit) => (
    <Frame lit={lit} label="a metric crossing its band and looping back to the start">
      <line x1="24" y1="30" x2="180" y2="30" {...soft} strokeDasharray="2 3" />
      <line x1="24" y1="62" x2="180" y2="62" {...soft} strokeDasharray="2 3" />
      <polyline {...ink} points="24,50 60,46 92,52 122,44 150,36 168,24" />
      <circle cx="168" cy="24" r="3" fill="currentColor" />
      <path d="M180 24 q26 20 0 58 h-150" {...soft} />
      <polyline points="36,76 30,82 36,88" {...soft} />
      <text x="100" y="92" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor" opacity="0.7">back to intent.md</text>
    </Frame>
  ),
];

function stepState(issue: Issue | undefined): "done" | "active" | "waiting" {
  if (!issue) return "waiting";
  if (issue.status === "done") return "done";
  if (issue.status === "in_progress" || issue.status === "in_review") return "active";
  return "waiting";
}

export function HowToUse() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => { setBreadcrumbs([{ label: "How to use" }]); }, [setBreadcrumbs]);

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Projects that carry gate issues, so the steps can light up per project.
  const gateProjects = useMemo(() => {
    const ids = new Set<string>();
    for (const i of issues ?? []) if (i.projectId && /^Gate \d/.test(i.title)) ids.add(i.projectId);
    return (projects ?? []).filter((p) => ids.has(p.id));
  }, [issues, projects]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const activeProject = gateProjects.find((p) => p.id === projectId) ?? gateProjects[0] ?? null;

  const byStep = useMemo(() => {
    const m = new Map<string, Issue>();
    for (const i of issues ?? []) {
      if (activeProject && i.projectId !== activeProject.id) continue;
      for (const s of STEPS) if (i.title.startsWith(s.match) && !m.has(s.match)) m.set(s.match, i);
    }
    return m;
  }, [issues, activeProject]);

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to see how the process is used." />;
  }

  const doneCount = STEPS.filter((s) => stepState(byStep.get(s.match)) === "done").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">How to use this</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              One human accepts every gate. Agents draft, and never approve their own work or anyone else's.
              Everything that matters is a file in Git, and nothing an agent does changes a running machine.
              Follow the eight steps in order; each one lights up when its gate issue is done.
            </p>
          </div>
          {gateProjects.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              project
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                value={activeProject?.id ?? ""}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {gateProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {activeProject && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{doneCount}</span> of {STEPS.length} steps done on{" "}
            <Link to={`/projects/${activeProject.id}`} className="underline hover:text-foreground">{activeProject.name}</Link>
          </p>
        )}
        {!activeProject && (
          <p className="mt-3 text-xs text-muted-foreground">
            No project here carries the gates yet. Apply the "AI-Native SDLC — stephen8n" template from Templates to seed them.
          </p>
        )}
      </div>

      <ol className="m-0 list-none space-y-3 p-0">
        {STEPS.map((step, i) => {
          const issue = byStep.get(step.match);
          const state = stepState(issue);
          const lit = state === "done";
          return (
            <li key={step.match}
              className={cn("flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-start",
                lit ? "border-primary/50" : state === "active" ? "border-amber-500/50" : "border-border")}>
              <div className="flex shrink-0 items-start gap-3">
                <span className={cn("mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  lit ? "border-primary bg-primary text-primary-foreground" : state === "active" ? "border-amber-500 text-amber-500" : "border-border text-muted-foreground")}>
                  {lit ? "✓" : i + 1}
                </span>
                {PICTURES[i](lit)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <span className="text-xs text-muted-foreground">{step.where}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  produces <span className="font-mono text-foreground">{step.artefact}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  {issue ? (
                    <Link to={issueUrl(issue)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-foreground hover:bg-accent">
                      {issue.identifier}
                      <span className="text-muted-foreground">·</span>
                      <span className="font-sans text-muted-foreground">{issue.status.replace("_", " ")}</span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">no issue for this step yet</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">The four kinds of change</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Standard", "Stays inside the envelope. Agents draft, you accept each gate in turn. No reassessment."],
            ["Normal", "Would widen the envelope on any axis. A new ai-risk-assessment.md is merged first, then the gates run."],
            ["Emergency", "Service failing or unsafe. You fix forward or roll back yourself, and write it up within a week as a new intent.md."],
            ["Prohibited", "Outside the envelope with no reassessment, or any agent action that changes a running machine, deploys, or moves client material into Git. Hooks refuse it."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-background p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          The full rules live in the template <span className="font-mono">ai-native-sdlc-stephen8n</span> under Templates: the envelope, the three kinds of change (code, data, external write), rollback, obligations and the twelve rules.
        </p>
      </div>
    </div>
  );
}
