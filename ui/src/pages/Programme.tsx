import { useEffect, useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { MetricCard } from "../components/MetricCard";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { Identity } from "../components/Identity";
import {
  ProjectHealthPanel,
  computeProjectHealth,
  RAG_META,
  type Rag,
} from "../components/ProjectHealthPanel";
import { cn, formatDate, issueUrl } from "../lib/utils";
import { timeAgo } from "../lib/timeAgo";
import { Hexagon, Goal, AlertTriangle, CircleDot, CheckCircle2, CalendarClock } from "lucide-react";
import type { Agent, Issue, Project } from "@paperclipai/shared";

export function Programme() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Programme" }]);
  }, [setBreadcrumbs]);

  const { data: projects, isLoading } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const activeProjects = useMemo(
    () => (projects ?? []).filter((p) => !p.archivedAt),
    [projects],
  );

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of activeProjects) m.set(p.id, p);
    return m;
  }, [activeProjects]);

  // Portfolio-level RAG counts
  const ragSummary = useMemo(() => {
    const byProject = new Map<string, Issue[]>();
    for (const i of issues ?? []) {
      if (!i.projectId) continue;
      const arr = byProject.get(i.projectId) ?? [];
      arr.push(i);
      byProject.set(i.projectId, arr);
    }
    const summary: Record<Rag, number> = { red: 0, amber: 0, green: 0, grey: 0 };
    for (const p of activeProjects) {
      const h = computeProjectHealth(p, byProject.get(p.id) ?? []);
      summary[h.rag] += 1;
    }
    return summary;
  }, [activeProjects, issues]);

  // Cross-portfolio attention list: blocked issues + overdue project issues
  const attention = useMemo(() => {
    const all = issues ?? [];
    const overdueProjectIds = new Set(
      activeProjects
        .filter((p) => p.targetDate && new Date(p.targetDate) < new Date())
        .map((p) => p.id),
    );
    return all
      .filter(
        (i) =>
          i.status === "blocked" ||
          (i.status !== "done" &&
            i.status !== "cancelled" &&
            i.projectId &&
            overdueProjectIds.has(i.projectId) &&
            i.priority === "high") ||
          (i.priority === "critical" && i.status !== "done" && i.status !== "cancelled"),
      )
      .sort((a, b) => {
        if (a.status === "blocked" && b.status !== "blocked") return -1;
        if (b.status === "blocked" && a.status !== "blocked") return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [issues, activeProjects]);

  // Milestones: projects with a target date, soonest first
  const milestones = useMemo(
    () =>
      activeProjects
        .filter((p) => p.targetDate)
        .sort(
          (a, b) =>
            new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime(),
        ),
    [activeProjects],
  );

  const portfolioStats = useMemo(() => {
    const all = (issues ?? []).filter((i) => {
      const p = i.projectId ? projectMap.get(i.projectId) : null;
      return !i.projectId || p; // count company-wide + active-project issues
    });
    const open = all.filter((i) => i.status === "backlog" || i.status === "todo").length;
    const active = all.filter((i) => i.status === "in_progress" || i.status === "in_review").length;
    const blocked = all.filter((i) => i.status === "blocked").length;
    const done = all.filter((i) => i.status === "done").length;
    return { open, active, blocked, done, total: all.length };
  }, [issues, projectMap]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Goal} message="Select a company to view the programme." />;
  }
  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }
  if (activeProjects.length === 0) {
    return <EmptyState icon={Hexagon} message="No projects yet. Add a project to populate the programme view." />;
  }

  const onTrack = ragSummary.green;
  const atRisk = ragSummary.red;

  return (
    <div className="space-y-6">
      {/* Portfolio RAG banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Programme health</h2>
          <p className="text-xs text-muted-foreground">
            {activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} across the portfolio
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {(["red", "amber", "green", "grey"] as Rag[])
            .filter((r) => ragSummary[r] > 0)
            .map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", RAG_META[r].dot)} />
                <span className="font-medium text-foreground tabular-nums">{ragSummary[r]}</span>
                {RAG_META[r].label}
              </span>
            ))}
        </div>
      </div>

      {/* Portfolio metrics */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 xl:grid-cols-4">
        <MetricCard
          icon={CheckCircle2}
          value={onTrack}
          label="On track"
          description={<span>{atRisk} at risk</span>}
        />
        <MetricCard
          icon={AlertTriangle}
          value={portfolioStats.blocked}
          label="Blocked tasks"
          to="/issues"
          description={<span>across all projects</span>}
        />
        <MetricCard
          icon={CircleDot}
          value={portfolioStats.active}
          label="In progress"
          to="/issues"
          description={<span>{portfolioStats.open} open in backlog</span>}
        />
        <MetricCard
          icon={CalendarClock}
          value={milestones.length}
          label="Milestones"
          description={
            milestones[0]?.targetDate ? (
              <span>next {formatDate(milestones[0].targetDate)}</span>
            ) : (
              <span>none scheduled</span>
            )
          }
        />
      </div>

      {/* Project health cards (reused panel, no header) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Project health
        </h3>
        <ProjectHealthPanel
          projects={activeProjects}
          issues={issues ?? []}
          agents={agents ?? []}
          showHeader={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attention required */}
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Needs attention
          </h3>
          {attention.length === 0 ? (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Nothing blocked or overdue. Programme is clear.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {attention.slice(0, 12).map((issue) => {
                const project = issue.projectId ? projectMap.get(issue.projectId) : null;
                const assignee = issue.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : null;
                return (
                  <Link
                    key={issue.id}
                    to={issueUrl(issue)}
                    className="block px-4 py-3 text-sm no-underline text-inherit transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0">
                        <StatusIcon status={issue.status} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{issue.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <PriorityIcon priority={issue.priority} />
                            {issue.priority}
                          </span>
                          {project && (
                            <span className="inline-flex items-center gap-1">
                              <Hexagon className="h-3 w-3" />
                              {project.name}
                            </span>
                          )}
                          {assignee && <Identity name={assignee.name} size="sm" />}
                          <span>· {timeAgo(issue.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone timeline */}
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Milestone timeline
          </h3>
          {milestones.length === 0 ? (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">No target dates set on any project.</p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {milestones.map((p) => {
                const overdue = p.targetDate && new Date(p.targetDate) < new Date();
                const lead = p.leadAgentId ? agentMap.get(p.leadAgentId) : null;
                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.urlKey ?? p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm no-underline text-inherit transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CalendarClock className={cn("h-4 w-4 shrink-0", overdue ? "text-red-500" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{p.name}</p>
                        {lead && (
                          <span className="text-[11px] text-muted-foreground">{lead.name}</span>
                        )}
                      </div>
                    </div>
                    <span className={cn("shrink-0 text-xs tabular-nums", overdue ? "font-medium text-red-500" : "text-muted-foreground")}>
                      {formatDate(p.targetDate!)}
                      {overdue && " · overdue"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
