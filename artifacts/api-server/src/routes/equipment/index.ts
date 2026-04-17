import { Router } from "express";
import { db } from "@workspace/db";
import { equipmentTable } from "@workspace/db";
import { CreateEquipmentBody, UpdateEquipmentBody, ListEquipmentQueryParams, GetEquipmentParams, UpdateEquipmentParams, DeleteEquipmentParams } from "@workspace/api-zod";
import { eq, ilike, and, or, isNull, sql, type SQL } from "drizzle-orm";

const router = Router();

/** Gera código logístico: [SETOR(3)]-[TIPO(3)]-[ID(4)]
 *  Ex: PRO-MOT-0001, UTI-CMP-0023 */
function generateLogisticsCode(id: number, sector?: string | null, type?: string | null): string {
  const cleanWord = (s?: string | null, fallback = "GRL") =>
    (s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")   // remove acentos
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3)
      .padEnd(3, "X") || fallback;

  const sec = cleanWord(sector, "GRL");
  const typ = cleanWord((type ?? "").split(/\s+/)[0], "EQP");
  const seq = String(id).padStart(4, "0");
  return `${sec}-${typ}-${seq}`;
}

/** Backfill: garante que todos os equipamentos tenham código logístico */
async function backfillLogisticsCodes() {
  try {
    const noCode = await db
      .select({ id: equipmentTable.id, sector: equipmentTable.sector, type: equipmentTable.type })
      .from(equipmentTable)
      .where(isNull(equipmentTable.logisticsCode));

    for (const eq of noCode) {
      const code = generateLogisticsCode(eq.id, eq.sector, eq.type);
      await db.update(equipmentTable)
        .set({ logisticsCode: code })
        .where(sql`${equipmentTable.id} = ${eq.id} AND ${equipmentTable.logisticsCode} IS NULL`);
    }
  } catch { /* silencioso — backfill é melhor esforco */ }
}

// Executa backfill ao iniciar
backfillLogisticsCodes();

router.get("/equipment", async (req, res) => {
  try {
    const query = ListEquipmentQueryParams.safeParse(req.query);
    const conditions: SQL[] = [];

    if (query.success) {
      if (query.data.search) {
        const term = `%${query.data.search}%`;
        // Busca em: nome, código logístico, setor, tipo, marca, modelo, localização
        conditions.push(
          or(
            ilike(equipmentTable.name,          term),
            ilike(equipmentTable.logisticsCode, term),
            ilike(equipmentTable.sector,        term),
            ilike(equipmentTable.type,          term),
            ilike(equipmentTable.brand,         term),
            ilike(equipmentTable.model,         term),
            ilike(equipmentTable.location,      term),
          )!,
        );
      }
      if (query.data.efficiency) {
        conditions.push(eq(equipmentTable.efficiencyLevel, query.data.efficiency));
      }
      if (query.data.sector) {
        conditions.push(ilike(equipmentTable.sector, `%${query.data.sector}%`));
      }
    }

    const equipment = conditions.length > 0
      ? await db.select().from(equipmentTable).where(and(...conditions)).orderBy(equipmentTable.createdAt)
      : await db.select().from(equipmentTable).orderBy(equipmentTable.createdAt);

    res.json(equipment);
  } catch (err) {
    req.log.error({ err }, "Failed to list equipment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/equipment", async (req, res) => {
  try {
    const body = CreateEquipmentBody.parse(req.body);
    const [equipment] = await db.insert(equipmentTable).values({
      ...body,
      updatedAt: new Date(),
    }).returning();

    // Gera e salva o código logístico com o ID real
    const code = generateLogisticsCode(equipment.id, equipment.sector, equipment.type);
    const [withCode] = await db.update(equipmentTable)
      .set({ logisticsCode: code })
      .where(eq(equipmentTable.id, equipment.id))
      .returning();

    res.status(201).json(withCode ?? equipment);
  } catch (err) {
    req.log.error({ err }, "Failed to create equipment");
    res.status(400).json({ error: "Invalid request body" });
  }
});

router.get("/equipment/:id", async (req, res) => {
  try {
    const params = GetEquipmentParams.parse({ id: parseInt(req.params.id) });
    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, params.id));
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    res.json(equipment);
  } catch (err) {
    req.log.error({ err }, "Failed to get equipment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/equipment/:id", async (req, res) => {
  try {
    const params = UpdateEquipmentParams.parse({ id: parseInt(req.params.id) });
    const body = UpdateEquipmentBody.parse(req.body);
    const [equipment] = await db.update(equipmentTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(equipmentTable.id, params.id))
      .returning();
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    // Regenera código se setor ou tipo mudaram
    if (body.sector !== undefined || body.type !== undefined) {
      const code = generateLogisticsCode(equipment.id, equipment.sector, equipment.type);
      const [updated] = await db.update(equipmentTable)
        .set({ logisticsCode: code })
        .where(eq(equipmentTable.id, params.id))
        .returning();
      return res.json(updated ?? equipment);
    }
    res.json(equipment);
  } catch (err) {
    req.log.error({ err }, "Failed to update equipment");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/equipment/:id", async (req, res) => {
  try {
    const params = DeleteEquipmentParams.parse({ id: parseInt(req.params.id) });
    await db.delete(equipmentTable).where(eq(equipmentTable.id, params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete equipment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { generateLogisticsCode };
export default router;
