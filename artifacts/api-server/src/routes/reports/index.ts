import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, equipmentTable, analysisTable } from "@workspace/db";
import { GetReportParams, GenerateReportParams } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/reports/:equipmentId", async (req, res) => {
  try {
    const params = GetReportParams.parse({ equipmentId: parseInt(req.params.equipmentId) });
    const [report] = await db.select().from(reportsTable)
      .where(eq(reportsTable.equipmentId, params.equipmentId))
      .orderBy(desc(reportsTable.generatedAt))
      .limit(1);
    if (!report) {
      return res.status(404).json({ error: "No report found" });
    }
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports/:equipmentId/generate", async (req, res) => {
  try {
    const params = GenerateReportParams.parse({ equipmentId: parseInt(req.params.equipmentId) });
    
    const [equipment] = await db.select().from(equipmentTable).where(eq(equipmentTable.id, params.equipmentId));
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    const [analysis] = await db.select().from(analysisTable)
      .where(eq(analysisTable.equipmentId, params.equipmentId))
      .orderBy(desc(analysisTable.createdAt))
      .limit(1);

    const equipmentInfo = JSON.stringify({
      nome: equipment.name,
      tipo: equipment.type,
      marca: equipment.brand,
      modelo: equipment.model,
      anoFabricacao: equipment.yearManufactured,
      tensao: equipment.voltage,
      corrente: equipment.current,
      potencia: equipment.power,
      horasDia: equipment.hoursPerDay,
      diasSemana: equipment.daysPerWeek,
      setor: equipment.sector,
      localizacao: equipment.location,
      condicaoAparente: equipment.apparentCondition,
      nivelEficiencia: equipment.efficiencyLevel,
      consumoMensalKwh: equipment.estimatedConsumptionMonthlyKwh,
      co2MensalKg: equipment.estimatedCo2MonthlyKg,
    }, null, 2);

    const analysisInfo = analysis ? JSON.stringify({
      tipoIdentificado: analysis.identifiedType,
      marcaIdentificada: analysis.identifiedBrand,
      modeloIdentificado: analysis.identifiedModel,
      resumoDiagnostico: analysis.aiSummary,
      problemasEncontrados: analysis.problemsFound,
      componentesDetectados: (analysis as typeof analysis & { detectedComponents?: unknown[] }).detectedComponents,
      recomendacoesRetrofit: analysis.retrofitRecommendations,
      recomendacoesMonitoramento: analysis.monitoringRecommendations,
      custoEstimadoRetrofit: analysis.estimatedRetrofitCostBrl,
      economiaMensalBrl: analysis.estimatedMonthlySavingsBrl,
      economiaAnualBrl: analysis.estimatedAnnualSavingsBrl,
      roiMeses: analysis.estimatedRoiMonths,
      reducaoConsumo: analysis.estimatedConsumptionReductionPct,
      reducaoCo2KgMes: analysis.estimatedCo2ReductionKgMonth,
      potenciaKw: analysis.estimatedPowerKw,
      co2MensalKgAnalise: analysis.estimatedCo2MonthlyKg,
    }, null, 2) : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `Você é um engenheiro sênior especialista em eficiência energética industrial no Brasil, com experiência comprovada em elaboração de laudos técnicos para BNDES, FINEP, BNDES Finem, BNDES MPME e Finame. Você domina as normas INMETRO de eficiência energética (Portaria INMETRO n° 553/2015 para motores, ABNT NBR ISO 50001) e os fatores de emissão de CO₂ do MCTI (Inventário Nacional de Emissões, Fator de Emissão da Rede Elétrica Brasileira — SIN). Gere relatórios técnicos rigorosos, formais e profissionais em português do Brasil. Responda SEMPRE em JSON válido.`
        },
        {
          role: "user",
          content: `Gere um relatório técnico e ESG completo para o equipamento industrial abaixo, adequado para submissão ao BNDES e linhas de crédito verde.

Dados do Equipamento:
${equipmentInfo}

${analysisInfo ? `Diagnóstico da IA (4 etapas — visão computacional, redes neurais, banco de legados, motor prescritivo):\n${analysisInfo}` : "Sem análise de IA disponível — baseie-se nos dados do equipamento."}

INSTRUÇÕES IMPORTANTES:
- Na seção machineDiagnosis: descreva o diagnóstico completo da máquina, identificando tipo, marca, modelo, componentes principais, estado de conservação, fator de envelhecimento e o conceito de "Carbono Invisível" (CO₂ extra gerado pela degradação que não aparece em medidores convencionais).
- Na seção co2Methodology: cite EXPLICITAMENTE as fontes oficiais brasileiras: (1) Fator de Emissão do SIN/MCTI vigente (em kgCO₂/kWh), (2) normas INMETRO de eficiência para o tipo de equipamento, (3) Inventário Nacional de Emissões MCTI. Calcule a linha de base de emissões atual e o potencial de redução pós-retrofit com esses fatores.
- Na seção retrofitPlan: apresente um plano estruturado em fases (Fase 1: Diagnóstico e Monitoramento, Fase 2: Intervenção Técnica, Fase 3: Validação e Certificação), com cronograma estimado, custo por fase, redução de CO₂ esperada por fase e fornecedores nacionais.

Retorne EXATAMENTE este JSON (sem markdown, sem explicações fora do JSON):
{
  "machineDiagnosis": "Diagnóstico técnico completo da máquina: tipo identificado, marca, modelo, componentes principais detectados (motores, painéis, etc.), estado de conservação, fator de envelhecimento estimado, definição e estimativa do Carbono Invisível para este equipamento específico. 3-4 parágrafos técnicos formais.",
  "co2Methodology": "Metodologia de cálculo de CO₂ com fontes oficiais: (1) linha de base de emissões atuais calculada com o Fator de Emissão do SIN/MCTI (kgCO₂/kWh — citar valor vigente), (2) comparação com eficiência nominal INMETRO para esta classe de equipamento, (3) projeção de redução de CO₂ pós-retrofit em kg/mês, ton/ano e equivalente em árvores ou veículos. Citar Portaria INMETRO pertinente quando aplicável.",
  "retrofitPlan": "Plano de retrofit estruturado em 3 fases:\nFASE 1 — DIAGNÓSTICO E MONITORAMENTO (Mês 1-2): instalação de sensores IoT e medidores de energia para baseline preciso. Custo estimado e redução CO₂ esperada.\nFASE 2 — INTERVENÇÃO TÉCNICA (Mês 3-6): implementação das soluções de retrofit prioritárias, com fornecedores nacionais, especificações técnicas e redução de CO₂ esperada por intervenção.\nFASE 3 — VALIDAÇÃO E CERTIFICAÇÃO (Mês 7-8): medição e verificação (M&V) conforme protocolo IPMVP, geração de relatórios de conformidade para BNDES. Custo total e ROI final.",
  "currentSituation": "Situação operacional atual: consumo energético, emissões de CO₂ mensais, condição do equipamento e impacto produtivo. 2-3 parágrafos.",
  "problemsIdentified": "Problemas identificados com severidade e impacto quantificado em CO₂ e custo energético.",
  "improvementOpportunities": "Oportunidades de melhoria com tecnologias disponíveis no mercado brasileiro e referências de casos similares.",
  "retrofitSolutions": "Soluções técnicas recomendadas com especificações, fornecedores nacionais e etapas de implantação.",
  "sustainableImpact": "Impacto ambiental: redução de emissões de CO₂, contribuição para ODS 7 (Energia Limpa), ODS 9 (Indústria), ODS 13 (Ação Climática) e Acordo de Paris.",
  "technicalJustification": "Justificativa técnica e econômica: TIR, VPL, payback simples e descontado, análise de sensibilidade.",
  "financingReadiness": "Elegibilidade e roteiro para BNDES Finem (projetos > R$ 10M), BNDES MPME Indústria, Finame Moderniza, FGI-BNDES e Proesco. Documentação necessária, garantias aceitas e linha do tempo do processo de aprovação."
}`
        }
      ]
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    let reportData: Record<string, string | number | null> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      reportData = {};
    }

    const [report] = await db.insert(reportsTable).values({
      equipmentId: params.equipmentId,
      currentSituation: (reportData.currentSituation as string) || "Situação atual não disponível",
      problemsIdentified: (reportData.problemsIdentified as string) || "Nenhum problema identificado",
      improvementOpportunities: (reportData.improvementOpportunities as string) || "Oportunidades não identificadas",
      retrofitSolutions: (reportData.retrofitSolutions as string) || "Soluções não disponíveis",
      estimatedCostsBrl: analysis?.estimatedRetrofitCostBrl ?? null,
      consumptionReductionPct: analysis?.estimatedConsumptionReductionPct ?? null,
      co2ReductionKgMonth: analysis?.estimatedCo2ReductionKgMonth ?? null,
      financialGainsBrl: analysis?.estimatedAnnualSavingsBrl ?? null,
      sustainableImpact: (reportData.sustainableImpact as string) ?? null,
      technicalJustification: (reportData.technicalJustification as string) ?? null,
      financingReadiness: (reportData.financingReadiness as string) ?? null,
      machineDiagnosis: (reportData.machineDiagnosis as string) ?? null,
      co2Methodology: (reportData.co2Methodology as string) ?? null,
      retrofitPlan: (reportData.retrofitPlan as string) ?? null,
    }).returning();

    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to generate report");
    res.status(500).json({ error: "Report generation failed" });
  }
});

export default router;
