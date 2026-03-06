import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * Documents ingested into the Mace context layer.
 * Each document belongs to a company (= Mace Consult project).
 */
export const maceDocuments = pgTable(
  "mace_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    sourceType: text("source_type").notNull(), // sharepoint | dataverse | email | teams | manual
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    mimeType: text("mime_type").notNull().default("text/plain"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySourceIdx: index("mace_docs_company_source_idx").on(table.companyId, table.sourceType),
    sourceUrlUniqueIdx: uniqueIndex("mace_docs_source_url_idx").on(table.companyId, table.sourceUrl),
  }),
);
