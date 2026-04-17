import { useParams, useLocation } from "wouter";
import { useGetReport, useGenerateReport, useGetEquipment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Printer, ArrowLeft, Building2, Leaf, Wrench, TrendingDown, DollarSign, Cpu, FlaskConical, ListChecks } from "lucide-react";

function ReportSection({ icon, title, content, className }: {
  icon: React.ReactNode; title: string; content?: string | null; className?: string
}) {
  if (!content) return null;
  return (
    <div className={`report-section ${className || ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="font-semibold text-[#333333] text-sm">{title}</h3>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-9">{content}</div>
    </div>
  );
}

export default function Report() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const equipmentId = parseInt(params.id || "0");

  const { data: report, isLoading: loadingR, refetch } = useGetReport(equipmentId, {
    query: { enabled: !!equipmentId, retry: false }
  });
  const { data: equipment } = useGetEquipment(equipmentId, { query: { enabled: !!equipmentId } });
  const generateReport = useGenerateReport();

  const handleGenerate = async () => {
    await generateReport.mutateAsync({ equipmentId });
    await refetch();
  };

  const handlePrint = () => window.print();

  if (loadingR) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-[#00B140]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <button onClick={() => navigate(`/equipment/${equipmentId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00B140] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex gap-2">
          {report && (
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Imprimir / Exportar PDF
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generateReport.isPending}
            size="sm"
            className="bg-[#00B140] hover:bg-[#007A33] text-white gap-2"
          >
            {generateReport.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            ) : (
              <><FileText className="w-4 h-4" /> {report ? "Regenerar" : "Gerar Relatório"}</>
            )}
          </Button>
        </div>
      </div>

      {!report && !generateReport.isPending && (
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <FileText className="w-10 h-10 text-[#00B140]" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#333333]">Relatório Técnico e ESG</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              Gere um relatório completo com análise técnica, impacto ambiental e justificativa para financiamento (BNDES e outros programas).
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            className="bg-[#00B140] hover:bg-[#007A33] text-white gap-2 h-12 px-8"
          >
            <FileText className="w-5 h-5" /> Gerar Relatório com IA
          </Button>
        </div>
      )}

      {generateReport.isPending && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-10 h-10 animate-spin text-[#00B140]" />
          <p className="text-gray-600 font-medium">Gerando relatório com IA...</p>
          <p className="text-sm text-gray-400">Isso pode levar alguns segundos</p>
        </div>
      )}

      {report && (
        <>
          {/* Report Header */}
          <div className="bg-[#007A33] text-white rounded-lg p-8 print-header">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MaquinAI — Relatório Técnico e ESG</h1>
                <p className="text-green-200 text-sm">IA para Energia e Sustentabilidade</p>
              </div>
            </div>
            <div className="border-t border-white/20 pt-4 mt-4">
              <h2 className="text-lg font-semibold">{equipment?.name}</h2>
              <p className="text-green-200 text-sm mt-1">
                {[equipment?.brand, equipment?.model, equipment?.type].filter(Boolean).join(" · ")}
              </p>
              <p className="text-green-200 text-xs mt-2">
                Relatório gerado em {new Date(report.generatedAt).toLocaleDateString("pt-BR", { dateStyle: "long" })}
              </p>
              <div className="flex items-center gap-1.5 mt-3 bg-white/10 rounded px-2.5 py-1 w-fit">
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="28" height="28" fill="#3DCD58"/>
                  <text x="14" y="20" fontSize="13" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">SE</text>
                </svg>
                <span className="text-[9px] text-green-200 font-semibold tracking-wide">Solução para <span className="text-white font-bold">Schneider Electric</span></span>
              </div>
            </div>
          </div>

          {/* Metrics Summary */}
          {(report.estimatedCostsBrl || report.consumptionReductionPct || report.co2ReductionKgMonth || report.financialGainsBrl) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <DollarSign className="w-4 h-4 text-[#007A33]" />, label: "Custo Estimado Retrofit", value: report.estimatedCostsBrl, format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
                { icon: <TrendingDown className="w-4 h-4 text-green-600" />, label: "Redução de Consumo", value: report.consumptionReductionPct, format: (v: number) => `${v.toFixed(0)}%` },
                { icon: <Leaf className="w-4 h-4 text-green-600" />, label: "Redução CO₂", value: report.co2ReductionKgMonth, format: (v: number) => `${v.toFixed(1)} kg/mês` },
                { icon: <DollarSign className="w-4 h-4 text-[#007A33]" />, label: "Ganhos Financeiros/Ano", value: report.financialGainsBrl, format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
              ].filter(m => m.value != null).map(({ icon, label, value, format }) => (
                <div key={label} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-center">
                  <div className="flex justify-center mb-2">{icon}</div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="font-bold text-[#333333] text-lg mt-1">{format(value!)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── SECOES NOVAS: Diagnóstico, CO2 e Plano de Retrofit ── */}

          {/* Diagnóstico da Máquina */}
          {(report as typeof report & { machineDiagnosis?: string }).machineDiagnosis && (
            <Card className="border-t-4 border-t-[#005B2A]">
              <div className="px-6 py-4 bg-[#005B2A] rounded-t-[calc(0.5rem-1px)]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-green-300" />
                  <div>
                    <p className="text-xs font-bold text-green-200 uppercase tracking-widest leading-none mb-0.5">Laudo Técnico</p>
                    <p className="text-sm font-bold text-white">Diagnóstico da Máquina</p>
                  </div>
                </div>
              </div>
              <CardContent className="pt-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {(report as typeof report & { machineDiagnosis?: string }).machineDiagnosis}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metodologia CO2 com fontes oficiais */}
          {(report as typeof report & { co2Methodology?: string }).co2Methodology && (
            <Card className="border-t-4 border-t-[#00B140]">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-5 h-5 text-[#00B140]" />
                  <p className="text-sm font-bold text-gray-800">Estimativa de Redução de CO₂</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Fator de Emissão SIN/MCTI</span>
                  <span className="text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Normas INMETRO</span>
                  <span className="text-xs font-bold bg-green-50 text-[#007A33] border border-green-200 px-2 py-0.5 rounded-full">Inventario Nacional MCTI</span>
                </div>
              </div>
              <CardContent className="pt-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {(report as typeof report & { co2Methodology?: string }).co2Methodology}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Plano de Retrofit por Fases */}
          {(report as typeof report & { retrofitPlan?: string }).retrofitPlan && (
            <Card className="border-t-4 border-t-[#007A33]">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#007A33]" />
                <div>
                  <p className="text-sm font-bold text-gray-800">Plano de Retrofit por Fases</p>
                  <p className="text-xs text-gray-400">Cronograma estruturado para acesso a credito BNDES</p>
                </div>
              </div>
              <CardContent className="pt-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {(report as typeof report & { retrofitPlan?: string }).retrofitPlan}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Report Sections — demais secoes técnicas */}
          <Card>
            <CardContent className="pt-6 space-y-8 divide-y divide-gray-100">
              <ReportSection
                icon={<Building2 className="w-4 h-4 text-[#007A33]" />}
                title="1. Situacao Atual do Equipamento"
                content={report.currentSituation}
              />
              <div className="pt-6">
                <ReportSection
                  icon={<FileText className="w-4 h-4 text-red-500" />}
                  title="2. Problemas Identificados"
                  content={report.problemsIdentified}
                />
              </div>
              <div className="pt-6">
                <ReportSection
                  icon={<TrendingDown className="w-4 h-4 text-[#007A33]" />}
                  title="3. Oportunidades de Melhoria"
                  content={report.improvementOpportunities}
                />
              </div>
              <div className="pt-6">
                <ReportSection
                  icon={<Wrench className="w-4 h-4 text-[#00B140]" />}
                  title="4. Solucoes de Retrofit Recomendadas"
                  content={report.retrofitSolutions}
                />
              </div>
              {report.sustainableImpact && (
                <div className="pt-6">
                  <ReportSection
                    icon={<Leaf className="w-4 h-4 text-green-600" />}
                    title="5. Impacto Ambiental e Social"
                    content={report.sustainableImpact}
                  />
                </div>
              )}
              {report.technicalJustification && (
                <div className="pt-6">
                  <ReportSection
                    icon={<FileText className="w-4 h-4 text-[#007A33]" />}
                    title="6. Justificativa Técnica e Economica"
                    content={report.technicalJustification}
                  />
                </div>
              )}
              {report.financingReadiness && (
                <div className="pt-6">
                  <ReportSection
                    icon={<Building2 className="w-4 h-4 text-blue-600" />}
                    title="7. Adequacao para Financiamento BNDES"
                    content={report.financingReadiness}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-xs text-gray-400 py-4 no-print">
            Relatório gerado automaticamente pela plataforma MaquinAI — Solução Schneider Electric para Energia e Sustentabilidade
          </div>
        </>
      )}
    </div>
  );
}
