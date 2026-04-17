import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  yearManufactured: integer("year_manufactured"),
  voltage: text("voltage"),
  current: text("current"),
  power: text("power"),
  color: text("color"),
  size: text("size"),
  hoursPerDay: real("hours_per_day"),
  daysPerWeek: real("days_per_week"),
  sector: text("sector"),
  location: text("location"),
  operatorNotes: text("operator_notes"),
  apparentCondition: text("apparent_condition"),
  noiseObserved: boolean("noise_observed"),
  heatingObserved: boolean("heating_observed"),
  vibrationObserved: boolean("vibration_observed"),
  imageUrl: text("image_url"),
  efficiencyLevel: text("efficiency_level"),
  estimatedPowerKw: real("estimated_power_kw"),
  estimatedCo2MonthlyKg: real("estimated_co2_monthly_kg"),
  estimatedConsumptionMonthlyKwh: real("estimated_consumption_monthly_kwh"),
  logisticsCode: text("logistics_code"),
  retrofitStatus: text("retrofit_status").default("pending"),
  measurementSource: text("measurement_source").default("estimado"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
