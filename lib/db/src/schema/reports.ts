import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  currentSituation: text("current_situation").notNull(),
  problemsIdentified: text("problems_identified").notNull(),
  improvementOpportunities: text("improvement_opportunities").notNull(),
  retrofitSolutions: text("retrofit_solutions").notNull(),
  estimatedCostsBrl: real("estimated_costs_brl"),
  consumptionReductionPct: real("consumption_reduction_pct"),
  co2ReductionKgMonth: real("co2_reduction_kg_month"),
  financialGainsBrl: real("financial_gains_brl"),
  sustainableImpact: text("sustainable_impact"),
  technicalJustification: text("technical_justification"),
  financingReadiness: text("financing_readiness"),
  machineDiagnosis: text("machine_diagnosis"),
  co2Methodology: text("co2_methodology"),
  retrofitPlan: text("retrofit_plan"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, generatedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
