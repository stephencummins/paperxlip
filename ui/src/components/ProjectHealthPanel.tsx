import { useMemo } from "react";
import { Link } from "@/lib/router";
import { Hexagon, AlertTriangle, CircleDot, CheckCircle2, Loader2 } from "lucide-react";
import { Identity } from "./Identity";
import { cn, formatDate, projectUrl } from "../lib/utils";
import type { Agent, Issue, Project } from "@paperclipai/shared";

export type Rag = "red" | "amber" | "green" | "grey";

export interface ProjectHealth {
  project: Project;
  total: number;
  done: number;
  blocked: number;
  active: number;
  open: number;
  progress: number;
  overdue: boolean;
  rag: Rag;
}

export const RAG_META: Record<Rag, { dot: string; label: string; ring: string }> = {
  red: { dot: "bg-red-500", label: "At risk", ring: "border-red-500/30" },
  amber: { dot: "bg-amber-500", label: "Watch", ring: "border-amber-500/25" },
  green: { dot: "bg-emerald-500", label: "On track", ring: "border-emerald-500/25" },
  grey: { dot: "bg-muted-foreground/40", label: "Not started", ring: "border-border" },
};

export function computeProjectHealth(project: Project, issues: Issue[]): ProjectHealth {
  const open = issues.filter((i) => i.status === "backlog" || i.status === "todo").length;
  const active = issues.filter((i) => i.status === "in_progress" || i.status === "in_review").length;
  const blocked = issues.filter((i) => i.status === "blocked").length;
  const done = issues.filter((i) => i.status === "done").length;
  const cancelled = issues.filter((i) => i.status === "cancelled").length;
  const total = issues.length - cancelled;
  const progress = total > 0 ? done / total : 0;

  const overdue = !!project.targetDate && new Date(project.targetDate) < new Date() && progress < 1;

  let rag: Rag;
  if (total === 0) {
    rag = "grey";
  } else if (blocked > 0 || overdue) {
    rag = "red";
  } else if (progress >= 1) {
    rag = "green";
  } else if (active > 0 && progress >= 0.5) {
    rag = "green";
  } else if (active > 0 || progress > 0) {
    rag = "amber";
  } else {
    rag = "grey";
  }

  return { project, total, done, blocked, active, open, progress, overdue, rag };
}

export function ProjectHealthPanel({
  projects,
  issues,
  agents,
  title = "Programme Overview",
  showHeader = true,
}: {
  projects: Project[];
  issues: Issue[];
  agents: Agent[];
  title?: string;
  showHeader?: boolean;
}) {
  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const health = useMemo(() => {
    const byProject = new Map<string, Issue[]>();
    for (const i of issues) {
      if (!i.projectId) continue;
      const arr = byProject.get(i.projectId) ?? [];
      arr.push(i);
      byProject.set(i.projectId, arr);
    }
    return projects
      .filter((p) => !p.archivedAt)
      .map((p) => computeProjectHealth(p, byProject.get(p.id) ?? []))
      .sort((a, b) => {
        const order: Record<Rag, number> = { red: 0, amber: 1, green: 2, grey: 3 };
        return order[a.rag] - order[b.rag];
      });
  }, [projects, issues]);

  if (health.length === 0) return null;

  const summary = health.reduce(
    (acc, h) => {
      acc[h.rag] += 1;
      return acc;
    },
    { red: 0, amber: 0, green: 0, grey: 0 } as Record<Rag, number>,
  );

  return (
    <div className="min-w-0">
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(["red", "amber", "green", "grey"] as Rag[])
              .filter((r) => summary[r] > 0)
              .map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", RAG_META[r].dot)} />
                  {summary[r]} {RAG_META[r].label}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {health.map((h) => {
          const meta = RAG_META[h.rag];
          const lead = h.project.leadAgentId ? agentMap.get(h.project.leadAgentId) : null;
          const pct = Math.round(h.progress * 100);
          return (
            <Link
              key={h.project.id}
              to={projectUrl(h.project)}
              className={cn(
                "group block rounded-lg border bg-card p-3 no-underline text-inherit transition-colors hover:border-foreground/20 hover:bg-accent/40",
                meta.ring,
              )}
            >
              <div className="flex items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} title={meta.label} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{h.project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label}
                    {h.overdue && " · overdue"}
                  </p>
                </div>
                <Hexagon className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{pct}% complete</span>
                  <span>{h.done}/{h.total} done</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", meta.dot)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {h.blocked > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    {h.blocked} blocked
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3" />
                  {h.active} active
                </span>
                <span className="inline-flex items-center gap-1">
                  <CircleDot className="h-3 w-3" />
                  {h.open} open
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {h.done} done
                </span>
              </div>

              {/* Footer: lead agent + target date */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                {lead ? (
                  <Identity name={lead.name} size="sm" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">No lead agent</span>
                )}
                {h.project.targetDate && (
                  <span className={cn("text-[11px]", h.overdue ? "text-red-500" : "text-muted-foreground")}>
                    {formatDate(h.project.targetDate)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
