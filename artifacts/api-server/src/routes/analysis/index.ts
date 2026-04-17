import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { analysisTable, equipmentTable } from "@workspace/db";
import { AnalyzeEquipmentBody, ConfirmAnalysisBody, GetEquipmentAnalysisParams, ConfirmAnalysisParams } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateLogisticsCode } from "../equipment";

const router = Router();

// In-memory job store
type JobStatus = "pending" | "processing" | "done" | "error";
interface Job {
  status: JobStatus;
  progress: string;
  data?: Record<string, unknown>;
  error?: string;
}
const jobs = new Map<string, Job>();

// Clean up old jobs after 10 minutes
function scheduleCleanup(jobId: string) {
  setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}

async function runAnalysis(jobId: string, body: ReturnType<typeof AnalyzeEquipmentBody.parse>) {
  const job = jobs.get(jobId)!;

  try {
    job.status = "processing";
    job.progress = "Processando dados do equipamento...";

    const equipmentInfo = body.equipmentData ? JSON.stringify(body.equipmentData, null, 2) : "";
    const textDesc = body.textDescription || "";

    const systemPrompt = `Você é um engenheiro sênior especialista em eficiência energética industrial, Indústria 4.0 e descarbonização industrial com 20 anos de experiência. Você opera um sistema de IA de 4 etapas para análise de máquinas industriais:

ETAPA 1 — VISÃO COMPUTACIONAL E OCR: Quando há imagem, você identifica a máquina por visão computacional, detecta placas de identificação e aplica OCR profundo para extrair modelo, número de série, potência (HP/kW) e RPM, mesmo em placas desgastadas ou oxidadas.

ETAPA 2 — REDES NEURAIS DE SIMILARIDADE: Quando a placa está ilegível ou há apenas descrição textual, você infere o tipo de máquina por silhueta, dimensões físicas e disposição dos componentes, comparando com banco de dados histórico de equipamentos industriais brasileiros. Forneça o grau de confiança da identificação.

ETAPA 3 — BANCO DE DADOS DE LEGADOS, FATOR DE ENVELHECIMENTO E CÁLCULO DE CO₂: Após identificar a máquina, aplique o Fator de Envelhecimento e estime SEPARADAMENTE dois valores independentes para esta máquina específica:

  1. E (kWh/hora): consumo energético real estimado, considerando a potência nominal, classe de eficiência e degradação por idade.
  2. C (kg-CO₂/hora): emissões estimadas para esta máquina, com base na sua intensidade carbônica específica (tipo de carga, ciclo de operação, perdas por calor, eficiência do motor).

  O Fator de Emissão desta máquina é derivado: EF (kg-CO₂/kWh) = C ÷ E
  — Cada máquina terá um EF próprio. Máquinas mais antigas e ineficientes terão EF maior.

  Converta para mensal: C_mensal = C_hora × horas_por_dia × 30
  O "Carbono Invisível" é o CO₂ extra pela degradação: C_invisível = (E_degradada − E_nominal_esperada) × (C/E) × horas × 30. Inclua nos problemsFound e no aiSummary.

ETAPA 4 — MOTOR PRESCRITIVO: Com base no diagnóstico completo, consulte a biblioteca de soluções de retrofit: VFDs para cargas variáveis, sensores de temperatura/vibração para risco de superaquecimento, motores IE3/IE4 para substituição, isolamento térmico para perdas de calor. As recomendações devem ser específicas, com fornecedores brasileiros quando possível.

Responda SEMPRE em JSON válido. Seja específico, técnico e use dados reais do mercado industrial brasileiro.`;

    const userContent: Array<{type: string; text?: string; image_url?: {url: string; detail: string}}> = [];

    const prompt = `Execute as 4 etapas de análise neste equipamento industrial e forneça um diagnóstico completo de descarbonização.

${textDesc ? `Descrição do operador: ${textDesc}` : ""}
${equipmentInfo ? `Dados técnicos conhecidos: ${equipmentInfo}` : ""}

INSTRUÇÕES DE ANÁLISE:
- ETAPA 1/OCR: Se houver imagem, tente extrair marca, modelo, potência, RPM e número de série da placa de identificação, mesmo que desgastada.
- ETAPA 2/SIMILARIDADE: Infira o tipo pelo perfil técnico. Indique o método usado em identificationMethod.
- ETAPA 3/LEGADO + CO₂: Estime E (kWh/hora) e C (kg-CO₂/hora) de forma INDEPENDENTE para esta máquina específica. NÃO use um fator fixo — derive o EF desta máquina como C ÷ E. Preencha: estimatedConsumptionHourlyKwh = E, estimatedCo2HourlyKg = C, estimatedCo2MonthlyKg = C × horas_por_dia × 30. Máquinas mais antigas e ineficientes devem ter EF maior (mais CO₂ por kWh consumido).
- ETAPA 4/PRESCRITIVO: Gere recomendações específicas com fornecedores brasileiros reais (WEG, Schneider Electric, Siemens, ABB, Voges, Tesco).

Retorne EXATAMENTE este JSON (sem markdown, sem explicações fora do JSON):
{
  "machineSuggestions": [
    {
      "title": "Tipo específico da máquina (ex: Motor de Indução Trifásico 55kW IE1)",
      "description": "Descrição detalhada com características típicas deste tipo e faixa de anos de fabricação",
      "confidence": "high|medium|low"
    }
  ],
  "identifiedType": "tipo principal identificado",
  "identifiedBrand": "marca identificada ou null",
  "identifiedModel": "modelo identificado ou null",
  "identificationMethod": "OCR de placa|Inferência por silhueta|Dados técnicos fornecidos|Inferência por descrição textual",
  "estimatedYearManufactured": 0,
  "detectedComponents": [
    {
      "name": "Nome do componente (ex: Motor Principal, Painel de Controle, Ventilador de Resfriamento)",
      "type": "motor|painel|ventilacao|bomba|compressor|transformador|sensor|outro",
      "specs": "Especificacoes tecnicas identificadas (ex: 15kW, trifasico, IE1)",
      "condition": "critico|degradado|regular|bom",
      "co2Impact": "alto|medio|baixo"
    }
  ],
  "estimatedPowerKw": 0.0,
  "estimatedConsumptionHourlyKwh": 0.0,
  "estimatedConsumptionDailyKwh": 0.0,
  "estimatedConsumptionMonthlyKwh": 0.0,
  "estimatedCo2HourlyKg": 0.0,
  "estimatedCo2MonthlyKg": 0.0,
  "agingFactor": 0.85,
  "invisibleCarbonKgMonth": 0.0,
  "efficiencyLevel": "inefficient|average|optimized",
  "problemsFound": [
    "Carbono Invisível estimado: X kg CO₂/mês gerados pela degradação da eficiência ao longo dos anos",
    "outros problemas identificados"
  ],
  "retrofitRecommendations": [
    {
      "category": "Categoria (ex: Automação, Substituição de Motor, Isolamento Térmico)",
      "item": "Item específico com fornecedor brasileiro (ex: Inversor de Frequência WEG CFW500 ou Schneider ATV320)",
      "description": "Como instalar, qual a redução esperada de CO₂ e o impacto no Carbono Invisível",
      "priority": "high|medium|low",
      "estimatedCostBrl": 5000.0
    }
  ],
  "monitoringRecommendations": [
    {
      "category": "Categoria do sensor (ex: Medição de Energia, Temperatura, Vibração)",
      "item": "Nome do dispositivo IoT com fornecedor (ex: Schneider PowerTag E63, WEG SCC-06)",
      "description": "O que o sensor mede, como instalar nesta máquina e como os dados revelam o Carbono Invisível em tempo real",
      "specificDevices": "Produtos disponíveis no Brasil (ex: Schneider PowerTag E, Carlo Gavazzi EM340, Tesco TM-3)",
      "metricsTracked": ["kWh consumido", "kW instantâneo", "CO₂ estimado em tempo real", "temperatura de operação", "fator de potência"],
      "integrations": "SCADA, MQTT, Modbus RTU/TCP, EcoStruxure, WEG Motion Fleet",
      "priority": "high|medium|low",
      "estimatedCostBrl": 1200.0
    }
  ],
  "estimatedRetrofitCostBrl": 0.0,
  "estimatedMonthlySavingsBrl": 0.0,
  "estimatedAnnualSavingsBrl": 0.0,
  "estimatedRoiMonths": 0.0,
  "estimatedConsumptionReductionPct": 0.0,
  "estimatedCo2ReductionKgMonth": 0.0,
  "aiSummary": "Resumo técnico de 3-4 frases mencionando: método de identificação usado, fator de envelhecimento aplicado, Carbono Invisível estimado e principal ação de descarbonização recomendada"
}

Forneça 2-4 sugestões de tipo de máquina. Identifique 2-5 componentes físicos visíveis ou inferíveis (motores, painéis elétricos, ventiladores, bombas, etc.) com suas especificações e estado. Forneça 2-3 recomendações de retrofit e 2-3 de monitoramento IoT. Use fornecedores e custos realistas do mercado brasileiro.`;

    userContent.push({ type: "text", text: prompt });

    if (body.imageBase64 && body.imageMimeType) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${body.imageMimeType};base64,${body.imageBase64}`,
          detail: "high",
        },
      });
      job.progress = "Analisando imagem com visão computacional...";
    } else {
      job.progress = "Consultando base de conhecimento industrial...";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent as Parameters<typeof openai.chat.completions.create>[0]["messages"][0]["content"],
        },
      ],
    });

    job.progress = "Gerando diagnóstico de eficiência...";

    const rawContent = completion.choices[0]?.message?.content || "{}";
    let aiData: Record<string, unknown> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
    } catch {
      aiData = {};
    }

    job.progress = "Salvando resultado...";

    const [analysis] = await db
      .insert(analysisTable)
      .values({
        equipmentId: body.equipmentId ?? null,
        status: "suggestions",
        machineSuggestions: (aiData.machineSuggestions as object[]) ?? [],
        identifiedType: (aiData.identifiedType as string) ?? null,
        identifiedBrand: (aiData.identifiedBrand as string) ?? null,
        identifiedModel: (aiData.identifiedModel as string) ?? null,
        estimatedPowerKw: (aiData.estimatedPowerKw as number) ?? null,
        estimatedConsumptionHourlyKwh: (aiData.estimatedConsumptionHourlyKwh as number) ?? null,
        estimatedConsumptionDailyKwh: (aiData.estimatedConsumptionDailyKwh as number) ?? null,
        estimatedConsumptionMonthlyKwh: (aiData.estimatedConsumptionMonthlyKwh as number) ?? null,
        estimatedCo2HourlyKg: (aiData.estimatedCo2HourlyKg as number) ?? null,
        estimatedCo2MonthlyKg: (aiData.estimatedCo2MonthlyKg as number) ?? null,
        efficiencyLevel: (aiData.efficiencyLevel as string) ?? null,
        problemsFound: (aiData.problemsFound as string[]) ?? [],
        retrofitRecommendations: (aiData.retrofitRecommendations as object[]) ?? [],
        monitoringRecommendations: (aiData.monitoringRecommendations as object[]) ?? [],
        detectedComponents: (aiData.detectedComponents as object[]) ?? [],
        estimatedRetrofitCostBrl: (aiData.estimatedRetrofitCostBrl as number) ?? null,
        estimatedMonthlySavingsBrl: (aiData.estimatedMonthlySavingsBrl as number) ?? null,
        estimatedAnnualSavingsBrl: (aiData.estimatedAnnualSavingsBrl as number) ?? null,
        estimatedRoiMonths: (aiData.estimatedRoiMonths as number) ?? null,
        estimatedConsumptionReductionPct: (aiData.estimatedConsumptionReductionPct as number) ?? null,
        estimatedCo2ReductionKgMonth: (aiData.estimatedCo2ReductionKgMonth as number) ?? null,
        aiSummary: (aiData.aiSummary as string) ?? null,
        rawTextDescription: textDesc || null,
      })
      .returning();

    if (body.equipmentId && analysis) {
      await db
        .update(equipmentTable)
        .set({
          efficiencyLevel: (aiData.efficiencyLevel as string) ?? undefined,
          estimatedPowerKw: (aiData.estimatedPowerKw as number) ?? undefined,
          estimatedCo2MonthlyKg: (aiData.estimatedCo2MonthlyKg as number) ?? undefined,
          estimatedConsumptionMonthlyKwh: (aiData.estimatedConsumptionMonthlyKwh as number) ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(equipmentTable.id, body.equipmentId));
    }

    job.status = "done";
    job.progress = "Concluído";
    job.data = analysis as Record<string, unknown>;
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "Falha na análise";
  }
}

// GET job status (polled by frontend)
router.get("/analysis/jobs/:jobId", (req, res) => {
  // Prevent 304 "Not Modified" responses — polling must always get fresh data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  delete req.headers["if-none-match"];
  delete req.headers["if-modified-since"];

  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({
    status: job.status,
    progress: job.progress,
    data: job.data ?? null,
    error: job.error ?? null,
  });
});

// POST start analysis job — returns immediately with jobId
router.post("/analysis", async (req, res) => {
  try {
    const body = AnalyzeEquipmentBody.parse(req.body);
    const jobId = randomUUID();

    jobs.set(jobId, { status: "pending", progress: "Iniciando análise..." });
    scheduleCleanup(jobId);

    // Fire and forget — runs in background
    runAnalysis(jobId, body).catch((err) => {
      const job = jobs.get(jobId);
      if (job) { job.status = "error"; job.error = String(err); }
    });

    res.json({ jobId });
  } catch (err) {
    req.log.error({ err }, "Failed to start analysis job");
    res.status(500).json({ error: "Failed to start analysis" });
  }
});

router.get("/equipment/:id/analysis", async (req, res) => {
  try {
    const params = GetEquipmentAnalysisParams.parse({ id: parseInt(req.params.id) });
    const [analysis] = await db
      .select()
      .from(analysisTable)
      .where(eq(analysisTable.equipmentId, params.id))
      .orderBy(desc(analysisTable.createdAt))
      .limit(1);
    if (!analysis) return res.status(404).json({ error: "No analysis found" });
    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Failed to get equipment analysis");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/analysis/:id/confirm", async (req, res) => {
  try {
    const params = ConfirmAnalysisParams.parse({ id: parseInt(req.params.id) });
    const body = ConfirmAnalysisBody.parse(req.body);

    const [existing] = await db.select().from(analysisTable).where(eq(analysisTable.id, params.id));
    if (!existing) return res.status(404).json({ error: "Analysis not found" });

    const suggestions = existing.machineSuggestions as Array<{ title: string; description: string; confidence: string }>;
    const selected = suggestions[body.selectedSuggestionIndex];

    // Extra form data optionally sent by client (not in generated Zod schema — read raw)
    const formData = (req.body.equipmentData ?? {}) as Record<string, unknown>;

    let equipmentId = existing.equipmentId;

    if (!equipmentId) {
      // Build equipment name from selected suggestion + brand/model
      const brandPart  = (formData.brand  as string) || existing.identifiedBrand  || "";
      const modelPart  = (formData.model  as string) || existing.identifiedModel  || "";
      const typePart   = (formData.type   as string) || existing.identifiedType   || selected?.title || "Equipamento";
      const nameParts  = [brandPart, modelPart].filter(Boolean);
      const name       = nameParts.length > 0 ? nameParts.join(" ") : selected?.title || typePart;

      const [newEquipment] = await db
        .insert(equipmentTable)
        .values({
          name,
          type:   typePart  || "Desconhecido",
          brand:  brandPart || "Desconhecido",
          model:  modelPart || "Desconhecido",
          yearManufactured:   formData.yearManufactured  ? parseInt(formData.yearManufactured as string)  : undefined,
          voltage:            (formData.voltage    as string) || undefined,
          current:            (formData.current    as string) || undefined,
          power:              (formData.power      as string) || undefined,
          hoursPerDay:        formData.hoursPerDay  ? parseFloat(formData.hoursPerDay as string)  : undefined,
          daysPerWeek:        formData.daysPerWeek  ? parseFloat(formData.daysPerWeek as string)  : undefined,
          sector:             (formData.sector     as string) || undefined,
          location:           (formData.location   as string) || undefined,
          apparentCondition:  (formData.apparentCondition as string) || undefined,
          noiseObserved:      formData.noiseObserved     ? Boolean(formData.noiseObserved)     : undefined,
          heatingObserved:    formData.heatingObserved   ? Boolean(formData.heatingObserved)   : undefined,
          vibrationObserved:  formData.vibrationObserved ? Boolean(formData.vibrationObserved) : undefined,
          operatorNotes:      (formData.operatorNotes as string) || undefined,
          efficiencyLevel:          existing.efficiencyLevel          ?? undefined,
          estimatedPowerKw:         existing.estimatedPowerKw         ?? undefined,
          estimatedCo2MonthlyKg:    existing.estimatedCo2MonthlyKg    ?? undefined,
          estimatedConsumptionMonthlyKwh: existing.estimatedConsumptionMonthlyKwh ?? undefined,
        })
        .returning();

      equipmentId = newEquipment.id;

      // Gera código logístico com o ID real
      const code = generateLogisticsCode(newEquipment.id, newEquipment.sector, newEquipment.type);
      await db.update(equipmentTable)
        .set({ logisticsCode: code })
        .where(eq(equipmentTable.id, newEquipment.id));
    } else {
      await db
        .update(equipmentTable)
        .set({
          efficiencyLevel:                existing.efficiencyLevel                ?? undefined,
          estimatedPowerKw:               existing.estimatedPowerKw               ?? undefined,
          estimatedCo2MonthlyKg:          existing.estimatedCo2MonthlyKg          ?? undefined,
          estimatedConsumptionMonthlyKwh: existing.estimatedConsumptionMonthlyKwh ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(equipmentTable.id, equipmentId));
    }

    const [updated] = await db
      .update(analysisTable)
      .set({
        status: "confirmed",
        selectedSuggestionIndex: body.selectedSuggestionIndex,
        identifiedType: selected?.title || existing.identifiedType,
        equipmentId,
      })
      .where(eq(analysisTable.id, params.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to confirm analysis");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
