import { Router } from "express";
import { db } from "@workspace/db";
import { equipmentTable, analysisTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const equipment = await db.select().from(equipmentTable);
    
    const totalEquipment = equipment.length;
    const inefficientCount = equipment.filter(e => e.efficiencyLevel === "inefficient").length;
    const averageCount = equipment.filter(e => e.efficiencyLevel === "average").length;
    const optimizedCount = equipment.filter(e => e.efficiencyLevel === "optimized").length;
    const analyzedCount = equipment.filter(e => e.efficiencyLevel !== null).length;
    const pendingRetrofitCount = equipment.filter(e => e.retrofitStatus === "pending").length;
    
    const totalCo2MonthlyKg = equipment.reduce((sum, e) => sum + (e.estimatedCo2MonthlyKg || 0), 0);
    const totalConsumptionMonthlyKwh = equipment.reduce((sum, e) => sum + (e.estimatedConsumptionMonthlyKwh || 0), 0);
    
    const allAnalysis = await db.select().from(analysisTable).where(eq(analysisTable.status, "confirmed"));
    const totalPotentialSavingsBrl = allAnalysis.reduce((sum, a) => sum + (a.estimatedAnnualSavingsBrl || 0) / 12, 0);
    const totalCo2ReductionPotentialKg = allAnalysis.reduce((sum, a) => sum + (a.estimatedCo2ReductionKgMonth || 0), 0);

    res.json({
      totalEquipment,
      inefficientCount,
      averageCount,
      optimizedCount,
      totalCo2MonthlyKg,
      totalConsumptionMonthlyKwh,
      totalPotentialSavingsBrl,
      totalCo2ReductionPotentialKg,
      analyzedCount,
      pendingRetrofitCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/esg-metrics", async (req, res) => {
  try {
    const equipment = await db.select().from(equipmentTable);
    const totalCo2 = equipment.reduce((sum, e) => sum + (e.estimatedCo2MonthlyKg || 0), 0);
    const totalKwh = equipment.reduce((sum, e) => sum + (e.estimatedConsumptionMonthlyKwh || 0), 0);

    const now = new Date();
    const metrics = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
      const factor = 0.85 + (5 - i) * 0.03;
      metrics.push({
        month,
        co2Kg: Math.round(totalCo2 * factor * 10) / 10,
        consumptionKwh: Math.round(totalKwh * factor * 10) / 10,
        savingsBrl: Math.round(totalKwh * factor * 0.70 * 0.15 * 10) / 10,
      });
    }

    res.json(metrics);
  } catch (err) {
    req.log.error({ err }, "Failed to get ESG metrics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/retrofit-priorities", async (req, res) => {
  try {
    const equipment = await db.select().from(equipmentTable);
    const analysisAll = await db.select().from(analysisTable);

    const analysisMap = new Map<number, typeof analysisAll[0]>();
    for (const a of analysisAll) {
      if (a.equipmentId !== null) {
        analysisMap.set(a.equipmentId, a);
      }
    }

    const priorities = equipment
      .filter(e => e.efficiencyLevel === "inefficient" || e.efficiencyLevel === "average")
      .map(e => {
        const a = analysisMap.get(e.id);
        const effScore = e.efficiencyLevel === "inefficient" ? 100 : 50;
        const savingsScore = a?.estimatedMonthlySavingsBrl || 0;
        return {
          equipmentId: e.id,
          name: e.name,
          efficiencyLevel: e.efficiencyLevel || "unknown",
          priorityScore: effScore + (savingsScore / 100),
          estimatedSavingsBrl: a?.estimatedMonthlySavingsBrl || 0,
          co2ReductionKg: a?.estimatedCo2ReductionKgMonth || (e.estimatedCo2MonthlyKg || 0) * 0.3,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10);

    res.json(priorities);
  } catch (err) {
    req.log.error({ err }, "Failed to get retrofit priorities");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
