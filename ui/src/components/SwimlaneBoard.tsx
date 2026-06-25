import { useMemo } from "react";
import { Link } from "@/lib/router";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import type { Issue } from "@paperclipai/shared";

const SWIMLANE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked", "done"];

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Project { id: string; name: string; }
interface Agent { id: string; name: string; }

interface SwimlaneBoardProps {
  issues: Issue[];
  projects?: Project[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
}

function SwimlaneCard({
  issue,
  agents,
  isLive,
}: {
  issue: Issue;
  agents?: Agent[];
  isLive?: boolean;
}) {
  const agentName = agents?.find((a) => a.id === issue.assigneeAgentId)?.name;
  return (
    <Link
      to={`/issues/${issue.identifier ?? issue.id}`}
      className="block no-underline text-inherit"
    >
      <div className="rounded-md border bg-card p-2 hover:shadow-sm transition-shadow cursor-pointer">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-muted-foreground font-mono leading-none">
            {issue.identifier ?? issue.id.slice(0, 6)}
          </span>
          {isLive && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
            </span>
          )}
        </div>
        <p className="text-xs leading-snug line-clamp-2 mb-1.5">{issue.title}</p>
        <div className="flex items-center gap-1.5">
          <PriorityIcon priority={issue.priority} />
          {agentName && <Identity name={agentName} size="xs" />}
        </div>
      </div>
    </Link>
  );
}

export function SwimlaneBoard({
  issues,
  projects,
  agents,
  liveIssueIds,
}: SwimlaneBoardProps) {
  const swimlanes = useMemo(() => {
    const projectMap = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
    const byProject = new Map<string | null, Issue[]>();

    for (const issue of issues) {
      const key = issue.projectId ?? null;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(issue);
    }

    const lanes: Array<{ key: string; label: string; issues: Issue[] }> = [];

    for (const [projectId, projectIssues] of byProject.entries()) {
      if (projectId) {
        lanes.push({
          key: projectId,
          label: projectMap.get(projectId) ?? "Unknown Project",
          issues: projectIssues,
        });
      }
    }
    lanes.sort((a, b) => a.label.localeCompare(b.label));

    if (byProject.has(null)) {
      lanes.push({ key: "__none", label: "No Project", issues: byProject.get(null)! });
    }

    return lanes;
  }, [issues, projects]);

  if (swimlanes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        No issues to display.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-2 px-2">
      <div className="min-w-max">
        {/* Column header */}
        <div className="flex border-b border-border mb-1">
          <div className="w-44 shrink-0 px-3 py-2" />
          {SWIMLANE_STATUSES.map((status) => (
            <div key={status} className="w-44 shrink-0 px-2 py-2 flex items-center gap-1.5">
              <StatusIcon status={status} />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {statusLabel(status)}
              </span>
            </div>
          ))}
        </div>

        {/* Swimlane rows */}
        {swimlanes.map((lane, idx) => {
          const byStatus = new Map<string, Issue[]>();
          for (const s of SWIMLANE_STATUSES) byStatus.set(s, []);
          for (const issue of lane.issues) {
            if (byStatus.has(issue.status)) byStatus.get(issue.status)!.push(issue);
          }
          const total = lane.issues.length;

          return (
            <div
              key={lane.key}
              className={`flex border-b border-border/60 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}
            >
              {/* Lane label */}
              <div className="w-44 shrink-0 px-3 py-3 border-r border-border flex flex-col justify-center gap-0.5">
                <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                  {lane.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{total} issue{total !== 1 ? "s" : ""}</span>
              </div>

              {/* Status cells */}
              {SWIMLANE_STATUSES.map((status) => {
                const cellIssues = byStatus.get(status) ?? [];
                return (
                  <div
                    key={status}
                    className="w-44 shrink-0 px-1.5 py-1.5 border-r border-border/30 min-h-[56px] space-y-1"
                  >
                    {cellIssues.map((issue) => (
                      <SwimlaneCard
                        key={issue.id}
                        issue={issue}
                        agents={agents}
                        isLive={liveIssueIds?.has(issue.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
