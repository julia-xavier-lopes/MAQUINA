import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysisTable = pgTable("analysis", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id"),
  status: text("status").notNull().default("pending"),
  machineSuggestions: jsonb("machine_suggestions").notNull().default([]),
  selectedSuggestionIndex: integer("selected_suggestion_index"),
  identifiedType: text("identified_type"),
  identifiedBrand: text("identified_brand"),
  identifiedModel: text("identified_model"),
  estimatedPowerKw: real("estimated_power_kw"),
  estimatedConsumptionHourlyKwh: real("estimated_consumption_hourly_kwh"),
  estimatedConsumptionDailyKwh: real("estimated_consumption_daily_kwh"),
  estimatedConsumptionMonthlyKwh: real("estimated_consumption_monthly_kwh"),
  estimatedCo2HourlyKg: real("estimated_co2_hourly_kg"),
  estimatedCo2MonthlyKg: real("estimated_co2_monthly_kg"),
  efficiencyLevel: text("efficiency_level"),
  problemsFound: jsonb("problems_found").notNull().default([]),
  retrofitRecommendations: jsonb("retrofit_recommendations").notNull().default([]),
  monitoringRecommendations: jsonb("monitoring_recommendations").notNull().default([]),
  detectedComponents: jsonb("detected_components").notNull().default([]),
  estimatedRetrofitCostBrl: real("estimated_retrofit_cost_brl"),
  estimatedMonthlySavingsBrl: real("estimated_monthly_savings_brl"),
  estimatedAnnualSavingsBrl: real("estimated_annual_savings_brl"),
  estimatedRoiMonths: real("estimated_roi_months"),
  estimatedConsumptionReductionPct: real("estimated_consumption_reduction_pct"),
  estimatedCo2ReductionKgMonth: real("estimated_co2_reduction_kg_month"),
  aiSummary: text("ai_summary"),
  rawImageBase64: text("raw_image_base64"),
  rawTextDescription: text("raw_text_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysisTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysisTable.$inferSelect;
