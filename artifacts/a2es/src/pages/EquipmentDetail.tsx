import { useParams, useLocation } from "wouter";
import { useGetEquipment, useGetEquipmentAnalysis, useGenerateReport, useGetReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, FileText, MessageSquare,
  Zap, Leaf, TrendingDown, AlertTriangle,
  CheckCircle, Factory, ChevronDown, ChevronUp, BarChart2,
  DollarSign, Target, Sparkles, Hash, Wifi, Radio,
  ImageIcon, BookOpen, Upload, Wrench, ClipboardCheck,
  Clock, Building2, CircleDollarSign, CalendarDays,
  AlertCircle, Plus,
} from "lucide-react";
import { useState } from "react";

const ENERGY_COST = 0.70;

function fmt(n?: number | null, dec = 0) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}
function brl(n?: number | null) {
  if (n == null) return "—";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type EffLevel = "inefficient" | "average" | "optimized";

const statusConfig: Record<EffLevel, {
  label: string; sublabel: string; topBorder: string;
  badgeBg: string; badgeText: string; accentText: string;
  lightBg: string; lightBorder: string; Icon: typeof AlertTriangle;
}> = {
  inefficient: {
    label: "Alto Potencial de Descarbonização",
    sublabel: "Esta máquina contribui significativamente para as emissões de carbono do processo produtivo — ação imediata recomendada",
    topBorder: "border-t-red-500", badgeBg: "bg-red-500", badgeText: "text-white",
    accentText: "text-red-600", lightBg: "bg-red-50", lightBorder: "border-red-200", Icon: AlertTriangle,
  },
  average: {
    label: "Potencial de Descarbonização Moderado",
    sublabel: "Baseado em padrões industriais, este equipamento apresenta potencial relevante de redução de emissões",
    topBorder: "border-t-amber-400", badgeBg: "bg-amber-400", badgeText: "text-white",
    accentText: "text-amber-600", lightBg: "bg-amber-50", lightBorder: "border-amber-200", Icon: TrendingDown,
  },
  optimized: {
    label: "Equipamento com Baixa Emissão",
    sublabel: "Este equipamento esta operando com bom desempenho ambiental dentro dos parametros atuais",
    topBorder: "border-t-[#00B140]", badgeBg: "bg-[#00B140]", badgeText: "text-white",
    accentText: "text-[#007A33]", lightBg: "bg-green-50", lightBorder: "border-green-200", Icon: CheckCircle,
  },
};

const priorityConfig: Record<EffLevel, { label: string; bg: string; text: string; dot: string }> = {
  inefficient: { label: "Prioridade Alta",  bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500"   },
  average:     { label: "Prioridade Media", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  optimized:   { label: "Prioridade Baixa", bg: "bg-green-100", text: "text-green-700", dot: "bg-[#00B140]" },
};

const actionPriorityConfig: Record<"high" | "medium" | "low", {
  label: string; badge: string; headerBg: string; headerBorder: string; cardBorder: string;
}> = {
  high:   { label: "Alta Prioridade",  badge: "bg-red-500 text-white",   headerBg: "bg-red-50",   headerBorder: "border-red-100",   cardBorder: "border-t-red-500"   },
  medium: { label: "Media Prioridade", badge: "bg-amber-400 text-white", headerBg: "bg-amber-50", headerBorder: "border-amber-100", cardBorder: "border-t-amber-400" },
  low:    { label: "Baixa Prioridade", badge: "bg-[#00B140] text-white", headerBg: "bg-green-50", headerBorder: "border-green-100", cardBorder: "border-t-[#00B140]" },
};

const recPriorityConfig = {
  high:   { label: "Alta prioridade",  color: "text-red-600 bg-red-50 border border-red-200"      },
  medium: { label: "Media prioridade", color: "text-amber-600 bg-amber-50 border border-amber-200" },
  low:    { label: "Baixa prioridade", color: "text-gray-500 bg-gray-50 border border-gray-200"   },
};

interface RetrofitRec {
  category: string; item: string; description: string;
  priority: "high" | "medium" | "low"; estimatedCostBrl?: number;
}
interface MonitoringRec {
  category: string; item: string; description: string;
  specificDevices?: string; metricsTracked?: string[];
  integrations?: string; priority: "high" | "medium" | "low"; estimatedCostBrl?: number;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

type TabId = "diagnostico" | "fotos" | "manutencao" | "inspecao";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "diagnostico", label: "Diagnóstico IA",    icon: Sparkles     },
  { id: "fotos",       label: "Fotos & Manual",    icon: ImageIcon    },
  { id: "manutencao",  label: "Manutenção",        icon: Wrench       },
  { id: "inspecao",    label: "Inspeção",          icon: ClipboardCheck },
];

export default function EquipmentDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [showTech, setShowTech] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("diagnostico");
  const id = parseInt(params.id || "0");

  const { data: equipment, isLoading } = useGetEquipment(id, { query: { enabled: !!id } });
  const { data: analysis, isLoading: isLoadingAnalysis, isError: isAnalysisError } = useGetEquipmentAnalysis(id, { query: { enabled: !!id, retry: false } });
  const generateReport = useGenerateReport();
  const { data: existingReport, refetch: refetchReport } = useGetReport(id, { query: { enabled: !!id, retry: false } });

  const handleGenerateReport = async () => {
    await generateReport.mutateAsync({ equipmentId: id });
    await refetchReport();
    navigate(`/reports/${id}`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#00B140]" /></div>;
  }
  if (!equipment) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Equipamento nao encontrado</p>
        <Button variant="outline" onClick={() => navigate("/equipment")} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const level    = (equipment.efficiencyLevel || "average") as EffLevel;
  const status   = statusConfig[level] ?? statusConfig.average;
  const priority = priorityConfig[level] ?? priorityConfig.average;
  const { Icon } = status;

  const monthlyKwh   = equipment.estimatedConsumptionMonthlyKwh ?? 0;
  const energyCost   = monthlyKwh * ENERGY_COST;
  const co2Monthly   = equipment.estimatedCo2MonthlyKg ?? 0;
  const reductionPct = analysis?.estimatedConsumptionReductionPct ?? 0;

  const monthlySavings = analysis?.estimatedMonthlySavingsBrl ?? (energyCost * reductionPct / 100);
  const annualSavings  = analysis?.estimatedAnnualSavingsBrl  ?? (monthlySavings * 12);
  const roiMonths      = analysis?.estimatedRoiMonths
    ?? (monthlySavings > 0 && analysis?.estimatedRetrofitCostBrl
      ? analysis.estimatedRetrofitCostBrl / monthlySavings : null);

  const co2Saving     = analysis?.estimatedCo2ReductionKgMonth ?? (co2Monthly * reductionPct / 100);
  const co2AnnualTons = co2Saving > 0 ? co2Saving * 12 / 1000 : 0;

  const recs       = (analysis?.retrofitRecommendations ?? []) as RetrofitRec[];
  const monitoring = ((analysis as unknown as {monitoringRecommendations?: MonitoringRec[]})?.monitoringRecommendations ?? []) as MonitoringRec[];
  const topRec     = recs[0];
  const otherRecs  = recs.slice(1);
  const problems   = (analysis?.problemsFound ?? []) as string[];
  const ap         = topRec ? (actionPriorityConfig[topRec.priority] ?? actionPriorityConfig.medium) : null;

  const techRows = [
    ["Tipo",                    equipment.type],
    ["Marca",                   equipment.brand],
    ["Modelo",                  equipment.model],
    ["Ano de Fabricação",       equipment.yearManufactured],
    ["Tensao",                  equipment.voltage],
    ["Corrente",                equipment.current],
    ["Potência",                equipment.power],
    ["Horas de Uso/Dia",        equipment.hoursPerDay  ? `${equipment.hoursPerDay}h`     : null],
    ["Dias de Operação/Semana", equipment.daysPerWeek  ? `${equipment.daysPerWeek} dias` : null],
    ["Setor",                   equipment.sector],
    ["Localização",             equipment.location],
    ["Condicao Aparente",       equipment.apparentCondition],
    ["Ruido Anormal",           equipment.noiseObserved     ? "Sim" : null],
    ["Aquecimento Excessivo",   equipment.heatingObserved   ? "Sim" : null],
    ["Vibracao Excessiva",      equipment.vibrationObserved ? "Sim" : null],
    ["Observacoes",             equipment.operatorNotes],
  ].filter(([, v]) => v != null && v !== "");

  const hoursPerMonth = (equipment.hoursPerDay ?? 0) * (equipment.daysPerWeek ?? 5) * 4.3;

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-5">

        {/* Voltar */}
        <button
          onClick={() => navigate("/equipment")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00B140] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Acervo
        </button>

        {/* ══════════════════════════════════════════════
            BNDES — BANNER PROEMINENTE NO TOPO
        ══════════════════════════════════════════════ */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-[#005B2A]">
          <div className="bg-[#005B2A] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-300 uppercase tracking-widest leading-none mb-0.5">
                  Relatório Oficial
                </p>
                <p className="text-white font-black text-base leading-tight">
                  Relatório BNDES / ESG
                </p>
                <p className="text-green-300 text-xs mt-0.5">
                  Documento para financiamento e conformidade ambiental
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={generateReport.isPending}
              className="bg-[#00B140] hover:bg-[#00C850] text-white font-black px-6 h-12 rounded-xl gap-2 text-sm shadow-md shrink-0"
            >
              {generateReport.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><FileText className="w-4 h-4" /> {existingReport ? "Ver Relatório BNDES" : "Gerar Relatório BNDES"}</>
              )}
            </Button>
          </div>
          {existingReport && (
            <div className="bg-green-50 border-t border-green-200 px-6 py-2 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#00B140]" />
              <p className="text-xs text-[#007A33] font-medium">Relatório gerado e disponível para download</p>
            </div>
          )}
        </div>

        {/* ── Cabeçalho da máquina ── */}
        <Card className="overflow-hidden shadow-md">
          <div className={`px-6 py-3 flex items-center justify-between gap-3 ${
            level === "inefficient" ? "bg-red-500" : level === "optimized" ? "bg-[#00B140]" : "bg-amber-400"
          }`}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-white" />
              <p className="text-white text-xs font-black uppercase tracking-widest">{status.label}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
              {priority.label}
            </span>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                {equipment.type && (
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5" /> {equipment.type}
                  </p>
                )}
                <h1 className="text-2xl font-black text-gray-900 leading-tight">{equipment.name}</h1>
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  {[equipment.brand, analysis?.identifiedBrand && !equipment.brand ? analysis.identifiedBrand : null].filter(Boolean).map(b => (
                    <span key={b} className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{b}</span>
                  ))}
                  {[equipment.model, analysis?.identifiedModel && !equipment.model ? analysis.identifiedModel : null].filter(Boolean).map(m => (
                    <span key={m} className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{m}</span>
                  ))}
                  {equipment.yearManufactured && (
                    <span className="inline-flex items-center text-xs font-black bg-[#005B2A] text-white px-2.5 py-0.5 rounded-full">
                      {equipment.yearManufactured}
                    </span>
                  )}
                </div>
                {(equipment as typeof equipment & { logisticsCode?: string }).logisticsCode && (
                  <div className="flex items-center gap-1 mt-2.5 text-xs font-mono font-bold text-[#007A33] bg-green-50 border border-green-200 px-2 py-1 rounded-md w-fit">
                    <Hash className="w-3 h-3" />
                    {(equipment as typeof equipment & { logisticsCode?: string }).logisticsCode}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 border border-[#007A33] text-[#007A33] hover:bg-green-50 text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Analisar com IA
              </button>
            </div>
            {!analysis && !isLoadingAnalysis && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">Este equipamento ainda não possui diagnóstico de IA</p>
              </div>
            )}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════
            NAVEGAÇÃO POR ABAS
        ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === id
                    ? "border-[#00B140] text-[#007A33] bg-green-50/50"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {label}
                {id === "diagnostico" && !analysis && !isLoadingAnalysis && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 inline-block" />
                )}
              </button>
            ))}
          </div>

          {/* ── ABA: DIAGNÓSTICO IA ── */}
          {activeTab === "diagnostico" && (
            <div className="p-1">
              <div className="space-y-4 p-4">

                {/* Sem análise */}
                {!isLoadingAnalysis && (isAnalysisError || !analysis) && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden border-t-4 border-t-[#007A33]">
                    <div className="px-6 py-4 bg-green-50 border-b border-green-100 flex items-center gap-3">
                      <Target className="w-5 h-5 text-[#007A33] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#007A33] uppercase tracking-widest leading-none mb-0.5">Diagnóstico IA não realizado</p>
                        <p className="text-xs text-gray-500">Análise com IA necessária para gerar plano de descarbonização</p>
                      </div>
                    </div>
                    <div className="px-6 py-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-[#00B140]" />
                      </div>
                      <p className="text-base font-black text-gray-800 mb-1">Nenhuma análise de IA disponível</p>
                      <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto leading-relaxed">
                        Realize uma análise com a IA para obter recomendações de redução de emissões, plano de descarbonização e estimativa de impacto ambiental.
                      </p>
                      <Button
                        onClick={() => navigate("/")}
                        className="bg-[#00B140] hover:bg-[#007A33] text-white font-bold px-6 h-10 rounded-lg gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Analisar Este Equipamento
                      </Button>
                    </div>
                  </div>
                )}

                {/* Impacto de Carbono */}
                {co2Monthly > 0 && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden border-t-4 border-t-[#00B140] shadow-sm">
                    <div className="px-6 py-4 bg-[#005B2A]">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-300" />
                        <div>
                          <p className="text-xs font-bold text-green-200 uppercase tracking-widest leading-none mb-0.5">Impacto de Carbono</p>
                          <p className="text-xs text-green-400">Emissões atuais e potencial de descarbonização</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pt-6 pb-5 bg-white">
                      <p className="text-sm text-gray-500 mb-1">Esta máquina emite</p>
                      <p className="text-5xl md:text-6xl font-black text-gray-900 leading-none">{fmt(co2Monthly, 0)}</p>
                      <p className="text-xl font-bold text-gray-500 mt-1 mb-1">kg de CO₂ por mes</p>
                      <p className="text-xs text-gray-400 mb-6">gerados mensalmente no processo produtivo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                        {reductionPct > 0 && (
                          <div className="rounded-xl bg-green-50 border-2 border-green-300 px-4 py-4 text-center">
                            <p className="text-3xl font-black text-[#007A33]">{fmt(reductionPct, 0)}%</p>
                            <p className="text-xs font-bold text-[#007A33] mt-1">potencial de redução</p>
                            <p className="text-xs text-gray-400 mt-0.5">das emissões totais</p>
                          </div>
                        )}
                        {co2Saving > 0 && (
                          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-center">
                            <p className="text-2xl font-black text-[#00B140]">-{fmt(co2Saving, 0)}</p>
                            <p className="text-xs font-semibold text-[#007A33] mt-1">kg CO₂ por mes</p>
                            <p className="text-xs text-gray-400 mt-0.5">redução mensal possivel</p>
                          </div>
                        )}
                        {co2AnnualTons > 0 && (
                          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-center">
                            <p className="text-2xl font-black text-[#00B140]">{fmt(co2AnnualTons, 1)}</p>
                            <p className="text-xs font-semibold text-[#007A33] mt-1">toneladas CO₂/ano</p>
                            <p className="text-xs text-gray-400 mt-0.5">redução anual estimada</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2.5 p-4 bg-[#005B2A] rounded-xl">
                        <Leaf className="w-4 h-4 text-green-300 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-100 leading-relaxed font-medium">
                          Com as ações corretas, é possível eliminar{" "}
                          <strong className="text-white">{fmt(co2Saving, 0)} kg de CO₂</strong> por mês
                          — equivalente a <strong className="text-white">{fmt(co2AnnualTons, 1)} toneladas por ano</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Componentes detectados */}
                {(() => {
                  type DC = { name: string; type: string; specs?: string; condition?: string; co2Impact?: string };
                  const comps = ((analysis as unknown as { detectedComponents?: DC[] })?.detectedComponents ?? []);
                  if (comps.length === 0) return null;
                  const condStyle: Record<string, { bg: string; text: string; dot: string }> = {
                    critico:   { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
                    degradado: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
                    regular:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
                    bom:       { bg: "bg-green-50",  text: "text-[#007A33]",  dot: "bg-[#00B140]"  },
                  };
                  const typeIcon: Record<string, string> = {
                    motor: "M", painel: "P", ventilacao: "V", bomba: "B",
                    compressor: "C", transformador: "T", sensor: "S", outro: "O",
                  };
                  return (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#005B2A] flex items-center justify-center">
                          <span className="text-[9px] font-black text-white">C</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Componentes Detectados</p>
                        <span className="ml-auto text-xs font-bold text-gray-400">{comps.length} componente{comps.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {comps.map((comp, i) => {
                          const cs = condStyle[comp.condition ?? "regular"] ?? condStyle["regular"];
                          return (
                            <div key={i} className="flex items-start gap-4 px-6 py-4">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-black text-gray-500">{typeIcon[comp.type] ?? "O"}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-gray-800">{comp.name}</p>
                                  {comp.condition && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cs.bg} ${cs.text}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                                      {comp.condition.charAt(0).toUpperCase() + comp.condition.slice(1)}
                                    </span>
                                  )}
                                  {comp.co2Impact === "alto" && (
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Impacto CO₂ alto</span>
                                  )}
                                </div>
                                {comp.specs && <p className="text-xs text-gray-500 mt-0.5">{comp.specs}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Análise sem recomendações */}
                {!isLoadingAnalysis && analysis && recs.length === 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden border-t-4 border-t-amber-400">
                    <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Recomendações não geradas</p>
                    </div>
                    <div className="px-6 py-5">
                      <p className="text-sm text-gray-500">Esta análise não gerou sugestões de redução de emissões. Realize uma nova análise para obter um plano detalhado.</p>
                      <Button onClick={() => navigate("/")} className="mt-4 bg-[#00B140] hover:bg-[#007A33] text-white font-bold h-9 px-5 text-sm gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Nova Análise
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ação recomendada */}
                {topRec && ap && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden border-t-4 border-t-[#007A33]">
                    <div className="px-6 py-4 bg-[#005B2A]">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-300" />
                          <div>
                            <p className="text-xs font-bold text-green-200 uppercase tracking-widest leading-none mb-0.5">Ação Recomendada para Descarbonização</p>
                            <p className="text-xs text-green-400">O que deve ser feito para reduzir as emissões de CO₂</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${ap.badge}`}>{ap.label}</span>
                      </div>
                    </div>
                    {topRec.priority === "high" && (
                      <div className="mx-6 mt-5 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium leading-relaxed">
                          Recomendamos intervenção imediata para reduzir emissões contínuas e o impacto ambiental acumulado deste equipamento.
                        </p>
                      </div>
                    )}
                    <div className="px-6 pt-4 pb-5">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">{topRec.category}</p>
                      <h2 className="text-2xl font-black text-gray-900 leading-snug mb-3">{topRec.item}</h2>
                      <p className="text-sm text-gray-600 leading-relaxed mb-5">{topRec.description}</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {reductionPct > 0 && (
                            <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-300">
                              <p className="text-3xl font-black text-[#007A33]">{fmt(reductionPct, 0)}%</p>
                              <p className="text-xs font-bold text-[#007A33] mt-1">redução de emissões</p>
                            </div>
                          )}
                          {co2Saving > 0 && (
                            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                              <p className="text-2xl font-black text-[#00B140]">-{fmt(co2Saving, 0)}</p>
                              <p className="text-xs font-semibold text-[#007A33] mt-1">kg CO₂/mes</p>
                            </div>
                          )}
                          {co2AnnualTons > 0 && (
                            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                              <p className="text-2xl font-black text-[#00B140]">{fmt(co2AnnualTons, 1)}</p>
                              <p className="text-xs font-semibold text-[#007A33] mt-1">ton CO₂/ano</p>
                            </div>
                          )}
                        </div>
                        {(monthlySavings > 0 || roiMonths || topRec.estimatedCostBrl) && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {monthlySavings > 0 && (
                              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center border border-gray-100">
                                <p className="text-sm font-bold text-gray-600">{brl(monthlySavings)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">economia/mes</p>
                              </div>
                            )}
                            {roiMonths && (
                              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center border border-gray-100">
                                <p className="text-sm font-bold text-gray-600">{fmt(roiMonths, 0)} meses</p>
                                <p className="text-xs text-gray-400 mt-0.5">payback</p>
                              </div>
                            )}
                            {topRec.estimatedCostBrl && (
                              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center border border-gray-100">
                                <p className="text-sm font-bold text-gray-600">{brl(topRec.estimatedCostBrl)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">investimento</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {otherRecs.length > 0 && (
                      <div className="border-t border-gray-100">
                        <div className="px-6 py-3 bg-gray-50">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ações adicionais de descarbonização</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {otherRecs.map((rec, i) => {
                            const rp = recPriorityConfig[rec.priority] ?? recPriorityConfig.low;
                            return (
                              <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-black text-gray-500">{i + 2}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className="text-sm font-bold text-gray-800">{rec.item}</p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rp.color}`}>{rp.label}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mb-1">{rec.category}</p>
                                  <p className="text-sm text-gray-500 leading-relaxed">{rec.description}</p>
                                  {rec.estimatedCostBrl && (
                                    <p className="text-xs text-gray-400 mt-1">Custo estimado: {brl(rec.estimatedCostBrl)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Diagnóstico final IA */}
                {analysis && (
                  <div className="rounded-xl border border-[#005B2A] shadow-md overflow-hidden">
                    <div className="bg-[#005B2A] px-6 py-4 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-green-300 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-widest leading-none mb-0.5">Diagnóstico Final IA</p>
                        <p className="text-xs text-green-300">Resultado completo da análise por inteligência artificial</p>
                      </div>
                    </div>
                    <div className="bg-[#007A33] px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Tipo",  value: analysis.identifiedType  || equipment.type  || "—" },
                        { label: "Marca", value: analysis.identifiedBrand || equipment.brand || "—" },
                        { label: "Modelo",value: analysis.identifiedModel || equipment.model || "—" },
                        { label: "Ano",   value: equipment.yearManufactured || "—" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-green-300 uppercase tracking-widest font-semibold mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-white truncate">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
                      {[
                        { label: "Nível de Eficiência", value: <span className={`text-sm font-black ${level === "inefficient" ? "text-red-600" : level === "optimized" ? "text-[#007A33]" : "text-amber-600"}`}>{status.label}</span> },
                        { label: "Emissão CO₂",         value: <span className="text-sm font-black text-gray-800">{fmt(co2Monthly, 1)} <span className="text-xs font-normal text-gray-400">kg/mês</span></span> },
                        { label: "Consumo Mensal",       value: <span className="text-sm font-black text-gray-800">{fmt(monthlyKwh)} <span className="text-xs font-normal text-gray-400">kWh</span></span> },
                        { label: "Fator de Envelhecimento", value: <span className="text-sm font-black text-gray-800">{(analysis as unknown as {agingFactor?: number}).agingFactor ? `${Math.round(((analysis as unknown as {agingFactor?: number}).agingFactor!) * 100)}%` : "—"}</span> },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">{label}</p>
                          {value}
                        </div>
                      ))}
                    </div>
                    {analysis.aiSummary && (
                      <div className="bg-green-50 px-6 py-4 border-b border-green-100">
                        <p className="text-[10px] font-bold text-[#007A33] uppercase tracking-widest mb-2">Laudo Técnico</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{analysis.aiSummary}</p>
                      </div>
                    )}
                    {problems.length > 0 && (
                      <div className="px-6 py-4 border-b border-gray-100 bg-white">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">Problemas Detectados</p>
                        <div className="space-y-2">
                          {problems.map((p, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50 border border-red-100">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700">{p}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="bg-white px-6 py-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Metodologia — 4 Etapas da Análise</p>
                      <div className="space-y-3">
                        {[
                          { n: "1", title: "Visão Computacional e OCR", text: analysis.identifiedBrand || analysis.identifiedModel ? `Marca e modelo extraídos via leitura da placa de identificação. Identificado: ${[analysis.identifiedBrand, analysis.identifiedModel].filter(Boolean).join(" ")}.` : "A IA analisou a imagem e dados textuais buscando placa de identificação, silhueta e componentes visíveis do equipamento." },
                          { n: "2", title: "Redes Neurais de Similaridade", text: `Perfil de consumo e características técnicas comparados com banco de dados histórico de equipamentos industriais brasileiros.${analysis.identifiedType ? ` Tipo confirmado: ${analysis.identifiedType}.` : ""}` },
                          { n: "3", title: "Banco de Legados + Fator de Envelhecimento", text: "Curvas de eficiência nominal cruzadas com o tempo de operação para calcular o Carbono Invisível — CO₂ extra gerado pela degradação que não aparece nos medidores convencionais." },
                          { n: "4", title: "Motor Prescritivo de Retrofit", text: `Biblioteca de soluções de descarbonização consultada: inversores de frequência, motores IE3/IE4, sensores de temperatura/vibração.${topRec ? ` Ação principal: ${topRec.item}.` : ""}` },
                        ].map(({ n, title, text }) => (
                          <div key={n} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#005B2A] flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-black text-white">{n}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-700 mb-0.5">{title}</p>
                              <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Impacto financeiro */}
                {(monthlySavings > 0 || annualSavings > 0 || roiMonths) && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-300" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Impacto Financeiro (Secundario)</p>
                    </div>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {monthlySavings > 0 && (
                          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Economia mensal</p>
                            <p className="text-base font-bold text-gray-600">{brl(monthlySavings)}</p>
                          </div>
                        )}
                        {annualSavings > 0 && (
                          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Economia anual</p>
                            <p className="text-base font-bold text-gray-600">{brl(annualSavings)}</p>
                          </div>
                        )}
                        {roiMonths && (
                          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Retorno do investimento</p>
                            <p className="text-base font-bold text-gray-600">{fmt(roiMonths, 0)} <span className="text-xs font-medium text-gray-400">meses payback</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Monitoramento IoT */}
                {monitoring.length > 0 && (
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden border-t-4 border-t-blue-500">
                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest leading-none mb-0.5">Monitoramento IoT em Tempo Real</p>
                        <p className="text-xs text-blue-500">Sensores e dispositivos para rastrear emissões de CO₂ continuamente</p>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {monitoring.map((rec, i) => (
                        <div key={i} className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Radio className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-blue-500 uppercase tracking-wide font-semibold mb-1">{rec.category}</p>
                              <h4 className="font-bold text-gray-900 text-sm mb-1">{rec.item}</h4>
                              <p className="text-xs text-gray-500 leading-relaxed mb-2">{rec.description}</p>
                              {rec.specificDevices && <p className="text-xs text-gray-400 mb-1.5"><span className="font-medium text-gray-500">Dispositivos: </span>{rec.specificDevices}</p>}
                              {rec.metricsTracked && rec.metricsTracked.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {rec.metricsTracked.map((m, j) => (
                                    <span key={j} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{m}</span>
                                  ))}
                                </div>
                              )}
                              {rec.integrations && <p className="text-xs text-gray-400 mb-1.5"><span className="font-medium text-gray-500">Integração: </span>{rec.integrations}</p>}
                              {rec.estimatedCostBrl && <p className="text-xs text-gray-400">Custo estimado: <span className="font-semibold text-gray-600">R$ {rec.estimatedCostBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dados técnicos */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowTech(!showTech)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                      <Factory className="w-3.5 h-3.5 text-gray-300" />
                      Dados Técnicos e Consumo Energético
                    </span>
                    {showTech ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </button>
                  {showTech && (
                    <div className="border-t border-gray-100 px-6 pb-5 pt-3">
                      {monthlyKwh > 0 && (() => {
                        const hourlyKwh = analysis?.estimatedConsumptionHourlyKwh ?? null;
                        const dailyKwh  = hourlyKwh && equipment.hoursPerDay ? hourlyKwh * equipment.hoursPerDay : null;
                        const annualKwh = monthlyKwh * 12;
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {hourlyKwh && (
                              <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-gray-700">{fmt(hourlyKwh, 2)} <span className="font-normal text-gray-400">kWh/h</span></p>
                                  <p className="text-xs text-gray-400">consumo horário</p>
                                </div>
                              </div>
                            )}
                            {dailyKwh && (
                              <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-gray-700">{fmt(dailyKwh, 1)} <span className="font-normal text-gray-400">kWh/dia</span></p>
                                  <p className="text-xs text-gray-400">consumo diário</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-gray-700">{fmt(monthlyKwh)} <span className="font-normal text-gray-400">kWh/mês</span></p>
                                <p className="text-xs text-gray-400">consumo mensal</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
                              <BarChart2 className="w-3.5 h-3.5 text-[#00B140] shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-[#007A33]">{fmt(annualKwh)} <span className="font-normal text-gray-400">kWh/ano</span></p>
                                <p className="text-xs text-gray-400">consumo máximo total</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {techRows.map(([label, value]) => (
                        <div key={String(label)} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-400 w-44 shrink-0 font-medium pt-0.5">{label}</span>
                          <span className="text-xs text-gray-600">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Consultar IA */}
                <div className="flex gap-3 pb-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 h-11 border-gray-300 text-gray-700 hover:border-[#00B140] hover:text-[#00B140] rounded-lg"
                    onClick={() => navigate("/chat")}
                  >
                    <MessageSquare className="w-4 h-4" /> Consultar IA Especialista
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: FOTOS & MANUAL (DAM) ── */}
          {activeTab === "fotos" && (
            <div className="p-6 space-y-6">
              {/* Foto principal */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-[#00B140]" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Foto Principal</p>
                </div>
                {equipment.imageUrl ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={equipment.imageUrl} alt={equipment.name} className="w-full max-h-80 object-contain" />
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500 font-medium">Foto do diagnóstico IA</p>
                      <span className="text-xs bg-green-50 text-[#007A33] font-bold px-2 py-0.5 rounded-full border border-green-200">Principal</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">Nenhuma foto cadastrada</p>
                    <p className="text-xs text-gray-400">Use o Diagnóstico IA para adicionar a foto principal</p>
                  </div>
                )}
              </div>

              {/* Fotos adicionais */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#00B140]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fotos Adicionais</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[#007A33] hover:text-[#00B140] border border-[#007A33] hover:border-[#00B140] px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" /> Adicionar Fotos
                  </button>
                </div>
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-10 gap-2">
                  <Upload className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-400">Sem fotos adicionais</p>
                  <p className="text-xs text-gray-400 text-center max-w-xs">
                    Adicione fotos de múltiplos ângulos: vista frontal, lateral, placa de identificação, pontos de acesso e manutenção
                  </p>
                </div>
              </div>

              {/* Manual técnico */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#00B140]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manual Técnico (PDF)</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[#007A33] hover:text-[#00B140] border border-[#007A33] hover:border-[#00B140] px-3 py-1.5 rounded-lg transition-colors">
                    <Upload className="w-3 h-3" /> Anexar Manual
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Manual não vinculado</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Anexe o manual do fabricante em PDF para facilitar manutenções e inspeções futuras
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Dica:</strong> Fotos de boa qualidade da placa de identificação da máquina melhoram significativamente a precisão do diagnóstico de IA.
                </p>
              </div>
            </div>
          )}

          {/* ── ABA: MANUTENÇÃO (ERP) ── */}
          {activeTab === "manutencao" && (
            <div className="p-6 space-y-6">

              {/* KPIs operacionais */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-[#00B140]" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados Operacionais</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <CircleDollarSign className="w-5 h-5 text-[#00B140] mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Custo Operacional / Mês</p>
                    <p className="text-base font-black text-gray-900">
                      {energyCost > 0 ? brl(energyCost) : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">baseado no consumo de energia</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <Building2 className="w-5 h-5 text-[#007A33] mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Centro de Custo</p>
                    <p className="text-base font-black text-gray-900 truncate">
                      {equipment.sector || "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{equipment.location || "Sem localização"}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <Clock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Horas de Operação / Mês</p>
                    <p className="text-base font-black text-gray-900">
                      {hoursPerMonth > 0 ? `${Math.round(hoursPerMonth)}h` : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {equipment.hoursPerDay ? `${equipment.hoursPerDay}h/dia · ${equipment.daysPerWeek ?? "?"}d/sem` : "Não informado"}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <CalendarDays className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Ano de Fabricação</p>
                    <p className="text-base font-black text-gray-900">
                      {equipment.yearManufactured ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {equipment.yearManufactured
                        ? `${new Date().getFullYear() - equipment.yearManufactured} anos de uso`
                        : "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Histórico de manutenções */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#00B140]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico de Manutenções</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[#007A33] hover:text-[#00B140] border border-[#007A33] hover:border-[#00B140] px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" /> Registrar Manutenção
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">Nenhuma manutenção registrada</p>
                    <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                      Registre manutenções preventivas e corretivas para acompanhar o histórico completo deste equipamento
                    </p>
                    <button className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#007A33] hover:text-[#00B140] bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Registrar Primeira Manutenção
                    </button>
                  </div>
                </div>
              </div>

              {/* Dica de custo energético */}
              {monthlySavings > 0 && (
                <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <Leaf className="w-4 h-4 text-[#00B140] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#007A33] mb-1">Potencial de redução de custos operacionais</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Com as ações de descarbonização recomendadas pela IA, o custo operacional mensal pode ser reduzido em{" "}
                      <strong className="text-[#007A33]">{brl(monthlySavings)}/mês</strong> (economia anual de <strong className="text-[#007A33]">{brl(annualSavings)}</strong>).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ABA: INSPEÇÃO ── */}
          {activeTab === "inspecao" && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#00B140]" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Relatório de Inspeção</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-[#007A33] hover:text-[#00B140] border border-[#007A33] hover:border-[#00B140] px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3 h-3" /> Nova Inspeção
                </button>
              </div>

              {/* Condição atual */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Condição Observada — Último Cadastro</p>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: "Condição Geral", value: equipment.apparentCondition, icon: CheckCircle, color: "text-[#00B140]" },
                    { label: "Ruído Anormal", value: equipment.noiseObserved ? "Detectado — requer atenção" : "Não detectado", icon: equipment.noiseObserved ? AlertTriangle : CheckCircle, color: equipment.noiseObserved ? "text-amber-500" : "text-[#00B140]" },
                    { label: "Aquecimento Excessivo", value: equipment.heatingObserved ? "Detectado — requer atenção" : "Não detectado", icon: equipment.heatingObserved ? AlertTriangle : CheckCircle, color: equipment.heatingObserved ? "text-red-500" : "text-[#00B140]" },
                    { label: "Vibração Excessiva", value: equipment.vibrationObserved ? "Detectado — requer atenção" : "Não detectada", icon: equipment.vibrationObserved ? AlertTriangle : CheckCircle, color: equipment.vibrationObserved ? "text-amber-500" : "text-[#00B140]" },
                  ].map(({ label, value, icon: ItemIcon, color }) => (
                    <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <ItemIcon className={`w-4 h-4 ${color} shrink-0`} />
                      <span className="text-xs text-gray-400 w-40 shrink-0 font-medium">{label}</span>
                      <span className="text-xs text-gray-700 font-medium">{value ?? "Não informado"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações do operador */}
              {equipment.operatorNotes && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações do Operador</p>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{equipment.operatorNotes}</p>
                  </div>
                </div>
              )}

              {/* Dados técnicos de referência para inspeção */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados Técnicos de Referência</p>
                </div>
                <div className="p-5">
                  {techRows.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {techRows.map(([label, value]) => (
                        <div key={String(label)} className="flex gap-3 py-2">
                          <span className="text-xs text-gray-400 w-44 shrink-0 font-medium pt-0.5">{label}</span>
                          <span className="text-xs text-gray-600">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Dados técnicos não cadastrados</p>
                  )}
                </div>
              </div>

              {/* Problemas detectados pela IA */}
              {problems.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Alertas da Análise IA</p>
                  <div className="space-y-2">
                    {problems.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-red-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico de inspeções */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Histórico de Inspeções</p>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
                    <ClipboardCheck className="w-10 h-10 text-gray-200" />
                    <p className="text-sm font-semibold text-gray-400">Nenhuma inspeção registrada</p>
                    <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                      Registre inspeções periódicas para manter o histórico de conformidade e subsidiar o relatório BNDES
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
