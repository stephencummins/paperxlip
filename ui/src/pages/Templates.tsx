import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { templatesApi, type TemplateSummary } from "@/api/templates";
import { Button } from "@/components/ui/button";
import {
  LayoutTemplate,
  Users,
  ChevronRight,
  Loader2,
  Check,
  ArrowRight,
  Network,
} from "lucide-react";
import { queryKeys } from "@/lib/queryKeys";

function AgentTree({ agents }: { agents: TemplateSummary["agents"] }) {
  const roots = agents.filter((a) => !a.reportsTo);
  const childrenOf = (name: string) => agents.filter((a) => a.reportsTo === name);

  function renderNode(agent: TemplateSummary["agents"][0], depth: number) {
    const children = childrenOf(agent.name);
    return (
      <div key={agent.name} style={{ paddingLeft: depth * 20 }}>
        <div className="flex items-center gap-2 py-0.5 text-sm">
          <span className="text-muted-foreground">{depth > 0 ? "└" : "●"}</span>
          <span className="font-medium">{agent.name}</span>
          {agent.title && (
            <span className="text-muted-foreground">— {agent.title}</span>
          )}
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="mt-2 font-mono text-xs">
      {roots.map((r) => renderNode(r, 0))}
    </div>
  );
}

function TemplateCard({
  template,
  onApply,
  applying,
}: {
  template: TemplateSummary;
  onApply: (id: string, name: string) => void;
  applying: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isApplying = applying === template.id;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{template.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {template.agentCount} agents
              </span>
              {template.issuePrefix && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {template.issuePrefix}
                </span>
              )}
              {template.contractType && (
                <span>{template.contractType}</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onApply(template.id, template.name)}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                Apply
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <Network className="h-3 w-3" />
          View org chart
        </button>

        {expanded && <AgentTree agents={template.agents} />}
      </div>
    </div>
  );
}

export function Templates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);
  const [result, setResult] = useState<{
    companyName: string;
    agentsCreated: number;
  } | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesApi.list(),
  });

  const applyMutation = useMutation({
    mutationFn: ({ templateId, companyName }: { templateId: string; companyName: string }) =>
      templatesApi.apply(templateId, { companyName }),
    onSuccess: (data) => {
      setApplying(null);
      setResult({
        companyName: data.company.name,
        agentsCreated: data.agents.filter((a) => a.action === "created").length,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
    onError: () => {
      setApplying(null);
    },
  });

  function handleApply(templateId: string, templateName: string) {
    setApplying(templateId);
    setResult(null);
    applyMutation.mutate({ templateId, companyName: templateName });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Apply a template to create a new company with a full team of agents.
          </p>
        </div>
      </div>

      {result && (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-medium">
              Created "{result.companyName}" with {result.agentsCreated} agents
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch to the new company from the sidebar to view the org chart and agents.
          </p>
        </div>
      )}

      {applyMutation.isError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to apply template. Check the server logs.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <LayoutTemplate className="mx-auto h-8 w-8 mb-2" />
          <p>No templates found in <code>templates/</code></p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates?.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={handleApply}
              applying={applying}
            />
          ))}
        </div>
      )}
    </div>
  );
}
