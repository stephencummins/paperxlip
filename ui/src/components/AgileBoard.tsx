import { useState } from "react";
import { Link } from "@/lib/router";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import { ChevronRight } from "lucide-react";
import type { Issue } from "@paperclipai/shared";

const SPRINT_STATUSES = ["todo", "in_progress", "in_review", "blocked"] as const;

const SPRINT_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  blocked: "Blocked",
};

interface Agent { id: string; name: string; }

interface AgileBoardProps {
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
}

function SprintCard({
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
      <div className="rounded-md border bg-card p-2.5 hover:shadow-sm transition-shadow cursor-pointer">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs text-muted-foreground font-mono">
            {issue.identifier ?? issue.id.slice(0, 8)}
          </span>
          {isLive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
        </div>
        <p className="text-sm leading-snug line-clamp-3 mb-2">{issue.title}</p>
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          {agentName && <Identity name={agentName} size="xs" />}
        </div>
      </div>
    </Link>
  );
}

function BacklogRow({ issue, agents, isLive }: { issue: Issue; agents?: Agent[]; isLive?: boolean }) {
  const agentName = agents?.find((a) => a.id === issue.assigneeAgentId)?.name;
  return (
    <Link
      to={`/issues/${issue.identifier ?? issue.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors no-underline text-inherit"
    >
      <StatusIcon status={issue.status} />
      <PriorityIcon priority={issue.priority} />
      <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">
        {issue.identifier ?? issue.id.slice(0, 8)}
      </span>
      <span className="text-sm flex-1 min-w-0 truncate">{issue.title}</span>
      {isLive && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {agentName && <Identity name={agentName} size="xs" />}
    </Link>
  );
}

export function AgileBoard({ issues, agents, liveIssueIds, onUpdateIssue }: AgileBoardProps) {
  const [backlogOpen, setBacklogOpen] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);

  const sprintIssues = issues.filter((i) => (SPRINT_STATUSES as readonly string[]).includes(i.status));
  const backlogIssues = issues.filter((i) => i.status === "backlog");
  const doneIssues = issues.filter((i) => i.status === "done" || i.status === "cancelled");

  const byStatus: Record<string, Issue[]> = { todo: [], in_progress: [], in_review: [], blocked: [] };
  for (const issue of sprintIssues) {
    byStatus[issue.status]?.push(issue);
  }

  return (
    <div className="space-y-6">
      {/* Sprint summary bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold">Current Sprint</h3>
          <p className="text-xs text-muted-foreground">
            {sprintIssues.length} active · {backlogIssues.length} in backlog
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {SPRINT_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-1">
              <StatusIcon status={s} />
              <span>{byStatus[s].length}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <StatusIcon status="done" />
            <span>{doneIssues.length} done</span>
          </div>
        </div>
      </div>

      {/* Sprint board — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SPRINT_STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1">
              <StatusIcon status={status} />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SPRINT_LABELS[status]}
              </span>
              <span className="text-xs text-muted-foreground/60 ml-auto tabular-nums">
                {byStatus[status].length}
              </span>
            </div>
            <div className="space-y-1.5 min-h-[80px] rounded-md bg-muted/20 p-1.5">
              {byStatus[status].map((issue) => (
                <SprintCard
                  key={issue.id}
                  issue={issue}
                  agents={agents}
                  isLive={liveIssueIds?.has(issue.id)}
                />
              ))}
              {byStatus[status].length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-4">—</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Backlog */}
      <Collapsible open={backlogOpen} onOpenChange={setBacklogOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-1 py-2 rounded-md hover:bg-accent/30 transition-colors">
          <ChevronRight
            className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90"
          />
          <StatusIcon status="backlog" />
          <span className="text-sm font-semibold">Backlog</span>
          <span className="text-xs text-muted-foreground ml-1">
            {backlogIssues.length} issue{backlogIssues.length !== 1 ? "s" : ""}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 border border-border rounded-md overflow-hidden divide-y divide-border/50">
            {backlogIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-3">Backlog is empty.</p>
            ) : (
              backlogIssues.map((issue) => (
                <BacklogRow
                  key={issue.id}
                  issue={issue}
                  agents={agents}
                  isLive={liveIssueIds?.has(issue.id)}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Done / Cancelled */}
      {doneIssues.length > 0 && (
        <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-1 py-2 rounded-md hover:bg-accent/30 transition-colors">
            <ChevronRight
              className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90"
            />
            <StatusIcon status="done" />
            <span className="text-sm font-semibold">Completed</span>
            <span className="text-xs text-muted-foreground ml-1">
              {doneIssues.length} issue{doneIssues.length !== 1 ? "s" : ""}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 border border-border rounded-md overflow-hidden divide-y divide-border/50">
              {doneIssues.map((issue) => (
                <BacklogRow
                  key={issue.id}
                  issue={issue}
                  agents={agents}
                  isLive={liveIssueIds?.has(issue.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
