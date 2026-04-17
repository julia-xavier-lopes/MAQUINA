import { Router } from "express";
import { db } from "@workspace/db";
import { equipmentTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/emissions/realtime", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const equipment = await db
    .select()
    .from(equipmentTable)
    .orderBy(equipmentTable.estimatedCo2MonthlyKg);

  const withCo2 = equipment.map((eq) => {
    const hoursPerDay = eq.hoursPerDay ?? 8;

    // Fator de emissão próprio da máquina: EF (kg-CO₂/kWh) = CO₂(kg) ÷ E(kWh)
    const co2Monthly_stored  = eq.estimatedCo2MonthlyKg ?? 0;
    const kwhMonthly_stored  = eq.estimatedConsumptionMonthlyKwh ?? 0;
    const EF_machine = kwhMonthly_stored > 0 ? co2Monthly_stored / kwhMonthly_stored : 0;

    // E horária (kWh/h)
    const E_hourly = eq.estimatedConsumptionHourlyKwh
      ?? (kwhMonthly_stored > 0 ? kwhMonthly_stored / (hoursPerDay * 30) : 0);

    // C(kg-CO₂) = E(kWh) × EF(kg/kWh)  →  mensal = C_hora × horas × 30
    const co2Hourly  = E_hourly * EF_machine;
    const co2Monthly = co2Hourly * hoursPerDay * 30;

    return {
      id: eq.id,
      name: eq.name,
      type: eq.type,
      brand: eq.brand,
      model: eq.model,
      logisticsCode: eq.logisticsCode,
      sector: eq.sector ?? "Geral",
      location: eq.location ?? "Sede Principal",
      efficiencyLevel: eq.efficiencyLevel ?? "average",
      measurementSource: eq.measurementSource ?? "estimado",
      co2MonthlyKg: co2Monthly,
      co2HourlyKg: co2Hourly,
      co2PerSecondKg: co2Hourly / 3600,
      hoursPerDay,
      powerKw: eq.estimatedPowerKw ?? 0,
      emissionFactorKgPerKwh: EF_machine,
    };
  });

  const totalCo2Monthly = withCo2.reduce((s, e) => s + e.co2MonthlyKg, 0);
  const totalCo2Hourly = withCo2.reduce((s, e) => s + e.co2HourlyKg, 0);
  const totalCo2PerSecond = withCo2.reduce((s, e) => s + e.co2PerSecondKg, 0);

  const sectorMap: Record<string, number> = {};
  const locationMap: Record<string, number> = {};
  for (const eq of withCo2) {
    sectorMap[eq.sector] = (sectorMap[eq.sector] ?? 0) + eq.co2MonthlyKg;
    locationMap[eq.location] = (locationMap[eq.location] ?? 0) + eq.co2MonthlyKg;
  }

  const bySector = Object.entries(sectorMap)
    .sort((a, b) => b[1] - a[1])
    .map(([sector, co2MonthlyKg]) => ({
      sector,
      co2MonthlyKg,
      percentage: totalCo2Monthly > 0 ? Math.round((co2MonthlyKg / totalCo2Monthly) * 100) : 0,
    }));

  const byLocation = Object.entries(locationMap)
    .sort((a, b) => b[1] - a[1])
    .map(([location, co2MonthlyKg]) => ({
      location,
      co2MonthlyKg,
      percentage: totalCo2Monthly > 0 ? Math.round((co2MonthlyKg / totalCo2Monthly) * 100) : 0,
    }));

  res.json({
    totalCo2MonthlyKg: totalCo2Monthly,
    totalCo2HourlyKg: totalCo2Hourly,
    totalCo2PerSecondKg: totalCo2PerSecond,
    totalCo2AnnualTons: (totalCo2Monthly * 12) / 1000,
    equipmentCount: withCo2.length,
    bySector,
    byLocation,
    equipment: withCo2.sort((a, b) => b.co2MonthlyKg - a.co2MonthlyKg),
  });
});

router.patch("/emissions/equipment/:id/source", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { measurementSource } = req.body as { measurementSource: string };

  const allowed = ["estimado", "sensor", "calculado"];
  if (!allowed.includes(measurementSource)) {
    res.status(400).json({ error: "Fonte invalida" });
    return;
  }

  await db
    .update(equipmentTable)
    .set({ measurementSource })
    .where(eq(equipmentTable.id, id));

  res.json({ ok: true });
});

export default router;
