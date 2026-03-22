import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@/lib/router";
import { api } from "@/api/client";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DocEntry {
  id: string;
  filename: string;
  name: string;
}

function useMarkdownRenderer() {
  const [marked, setMarked] = useState<{ parse: (md: string) => string } | null>(null);

  useEffect(() => {
    // Load marked.js dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = () => {
      setMarked((window as unknown as Record<string, unknown>).marked as typeof marked);
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return marked;
}

function DocSidebar({
  docs,
  activeId,
  onSelect,
}: {
  docs: DocEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
      <div className="px-3 py-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Documentation
        </h3>
        <div className="flex flex-col gap-0.5">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-left transition-colors ${
                activeId === doc.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{doc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Docs() {
  const params = useParams<{ docId?: string }>();
  const [activeDocId, setActiveDocId] = useState<string | null>(params.docId ?? null);
  const marked = useMarkdownRenderer();

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["docs-list"],
    queryFn: () => api.get<DocEntry[]>("/docs"),
  });

  const { data: docContent, isLoading: contentLoading } = useQuery({
    queryKey: ["docs-content", activeDocId],
    queryFn: () => api.get<{ id: string; content: string }>(`/docs/${activeDocId}`),
    enabled: !!activeDocId,
  });

  // Auto-select first doc
  useEffect(() => {
    if (!activeDocId && docs && docs.length > 0) {
      setActiveDocId(docs[0].id);
    }
  }, [docs, activeDocId]);

  const renderedHtml = marked && docContent?.content ? marked.parse(docContent.content) : null;

  return (
    <div className="flex h-full min-h-0">
      {docsLoading ? (
        <div className="flex items-center justify-center w-full py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <DocSidebar
            docs={docs ?? []}
            activeId={activeDocId}
            onSelect={setActiveDocId}
          />
          <div className="flex-1 overflow-y-auto">
            {contentLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : renderedHtml ? (
              <article
                className="prose prose-invert prose-sm max-w-3xl px-8 py-6
                  prose-headings:text-foreground
                  prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-4
                  prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3
                  prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-li:text-muted-foreground
                  prose-strong:text-foreground
                  prose-code:text-violet-400 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                  prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                  prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:border-l-violet-500 prose-blockquote:text-muted-foreground
                  prose-table:text-sm
                  prose-th:text-muted-foreground prose-th:font-semibold prose-th:border-b-2 prose-th:border-border
                  prose-td:border-b prose-td:border-border
                  prose-hr:border-border"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BookOpen className="h-8 w-8 mb-2" />
                <p className="text-sm">Select a document to read.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
