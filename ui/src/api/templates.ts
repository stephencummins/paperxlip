import type {
  CompanyPortabilityImportResult,
  CompanyPortabilityPreviewResult,
} from "@paperclipai/shared";
import { api } from "./client";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  issuePrefix: string | null;
  contractType: string | null;
  agents: Array<{
    name: string;
    role: string;
    title: string | null;
    icon: string | null;
    reportsTo: string | null;
  }>;
}

export const templatesApi = {
  list: () => api.get<TemplateSummary[]>("/templates"),
  get: (templateId: string) => api.get<TemplateSummary & { raw: unknown }>(`/templates/${templateId}`),
  preview: (templateId: string, data: { companyName?: string; companyId?: string; collisionStrategy?: string }) =>
    api.post<CompanyPortabilityPreviewResult>(`/templates/${templateId}/preview`, data),
  apply: (
    templateId: string,
    data: { companyName?: string; companyId?: string; agents?: string | string[]; collisionStrategy?: string },
  ) => api.post<CompanyPortabilityImportResult>(`/templates/${templateId}/apply`, data),
};
