import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useConfirmAnalysis } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, ArrowRight, Loader2, AlertTriangle,
  Zap, Leaf, TrendingDown, Cpu,
  Factory, Settings, Sparkles,
} from "lucide-react";

interface MachineSuggestion {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface RetrofitRec {
  category: string;
  item: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedCostBrl?: number;
}

interface Analysis {
  id: number;
  equipmentId?: number;
  machineSuggestions: MachineSuggestion[];
  aiSummary?: string;
  identifiedType?: string;
  identifiedBrand?: string;
  identifiedModel?: string;
  estimatedPowerKw?: number;
  estimatedConsumptionMonthlyKwh?: number;
  estimatedCo2MonthlyKg?: number;
  efficiencyLevel?: "inefficient" | "average" | "optimized";
  problemsFound?: string[];
  retrofitRecommendations?: RetrofitRec[];
  monitoringRecommendations?: MonitoringRec[];
  estimatedMonthlySavingsBrl?: number;
  estimatedAnnualSavingsBrl?: number;
  estimatedRoiMonths?: number;
  estimatedRetrofitCostBrl?: number;
  estimatedConsumptionReductionPct?: number;
}

interface EquipmentForm {
  type?: string;
  brand?: string;
  model?: string;
  yearManufactured?: string;
  voltage?: string;
  current?: string;
  power?: string;
  hoursPerDay?: string;
  daysPerWeek?: string;
  sector?: string;
  location?: string;
  apparentCondition?: string;
  noiseObserved?: boolean;
  heatingObserved?: boolean;
  vibrationObserved?: boolean;
  operatorNotes?: string;
}

const confidenceConfig = {
  high:   { label: "Alta confianca",  color: "text-green-700 bg-green-50 border-green-200" },
  medium: { label: "Media confianca", color: "text-amber-700 bg-amber-50 border-amber-200" },
  low:    { label: "Baixa confianca", color: "text-gray-500 bg-gray-50 border-gray-200"   },
};

const efficiencyConfig = {
  inefficient: { label: "Alta Ineficiencia", badge: "bg-red-500 text-white",    border: "border-t-red-500" },
  average:     { label: "Eficiência Moderada", badge: "bg-amber-400 text-white", border: "border-t-amber-400" },
  optimized:   { label: "Equipamento Eficiente", badge: "bg-[#00B140] text-white", border: "border-t-[#00B140]" },
};

const priorityConfig = {
  high:   { label: "Alta Prioridade",  badge: "bg-red-500 text-white",    headerBg: "bg-red-50",    headerBorder: "border-red-100", cardBorder: "border-t-red-500"   },
  medium: { label: "Media Prioridade", badge: "bg-amber-400 text-white",  headerBg: "bg-amber-50",  headerBorder: "border-amber-100", cardBorder: "border-t-amber-400" },
  low:    { label: "Baixa Prioridade", badge: "bg-[#00B140] text-white",  headerBg: "bg-green-50",  headerBorder: "border-green-100", cardBorder: "border-t-[#00B140]" },
};

function fmt(n?: number | null, dec = 0) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}
function brl(n?: number | null) {
  if (n == null) return "—";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InfoTag({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-sm font-semibold text-gray-800 mt-0.5">{value}</span>
    </div>
  );
}

export default function Suggestions() {
  const [, navigate] = useLocation();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [form, setForm] = useState<EquipmentForm | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState<"image" | "text">("text");
  const confirmAnalysis = useConfirmAnalysis();

  useEffect(() => {
    const stored = localStorage.getItem("a2es_analysis");
    const storedForm = localStorage.getItem("a2es_equipment_form");
    const storedMode = localStorage.getItem("a2es_scan_mode") as "image" | "text" | null;
    if (!stored) { navigate("/scan"); return; }
    try {
      const parsed: Analysis = JSON.parse(stored);
      setAnalysis(parsed);
      if (storedForm) setForm(JSON.parse(storedForm));
      if (storedMode) setScanMode(storedMode);
      // Photo mode: auto-select highest confidence suggestion
      if (storedMode === "image" && parsed.machineSuggestions?.length > 0) {
        setSelected(0);
      }
    } catch {
      navigate("/scan");
    }
  }, [navigate]);

  const handleConfirm = async () => {
    if (!analysis || selected === null) return;
    try {
      const result = await confirmAnalysis.mutateAsync({
        id: analysis.id,
        data: {
          selectedSuggestionIndex: selected,
          // Pass form data so API can create the equipment entry with full details
          equipmentData: form ?? undefined,
        } as Parameters<typeof confirmAnalysis.mutateAsync>[0]["data"],
      });
      localStorage.removeItem("a2es_analysis");
      localStorage.removeItem("a2es_equipment_form");
      localStorage.removeItem("a2es_scan_mode");
      // Navigate to the equipment that was just created or already existed
      const equipmentId = (result as Record<string, unknown>).equipmentId ?? analysis.equipmentId;
      navigate(equipmentId ? `/equipment/${equipmentId}` : "/equipment");
    } catch {
      navigate("/equipment");
    }
  };

  if (!analysis) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B140]" />
      </div>
    );
  }

  const eff = analysis.efficiencyLevel
    ? (efficiencyConfig[analysis.efficiencyLevel] ?? efficiencyConfig.average)
    : null;

  const topRec = analysis.retrofitRecommendations?.[0];
  const ap = topRec ? (priorityConfig[topRec.priority] ?? priorityConfig.medium) : null;

  const brand  = analysis.identifiedBrand  || form?.brand  || null;
  const model  = analysis.identifiedModel  || form?.model  || null;
  const type   = analysis.identifiedType   || form?.type   || null;
  const power  = analysis.estimatedPowerKw ? `${fmt(analysis.estimatedPowerKw, 1)} kW` : (form?.power || null);
  const voltage = form?.voltage || null;
  const year   = form?.yearManufactured || null;
  const hours  = form?.hoursPerDay ? `${form.hoursPerDay}h/dia` : null;
  const sector = form?.sector || null;
  const condition = form?.apparentCondition || null;

  const problems = analysis.problemsFound ?? [];
  const hasMachineInfo = brand || model || type || power || voltage || year;

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-4">

        {/* Titulo */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#00B140]" />
            <p className="text-xs font-bold text-[#007A33] uppercase tracking-widest">Análise concluida</p>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Relatorio de Diagnóstico IA</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revise o que a IA identificou e confirme o tipo de equipamento para salvar o diagnóstico
          </p>
        </div>

        {/* ── CARD 1: MAQUINA IDENTIFICADA ── */}
        {hasMachineInfo && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Equipamento Identificado</p>
              </div>
              {eff && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${eff.badge}`}>
                  {eff.label}
                </span>
              )}
            </div>
            <div className="px-6 py-5">
              {type && (
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{type}</p>
              )}
              {(brand || model) && (
                <h2 className="text-xl font-black text-gray-900 mb-4">
                  {[brand, model].filter(Boolean).join(" · ")}
                </h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <InfoTag label="Ano de Fabricação" value={year} />
                <InfoTag label="Potência Estimada" value={power} />
                <InfoTag label="Tensao" value={voltage} />
                <InfoTag label="Uso Diario" value={hours} />
                <InfoTag label="Setor" value={sector} />
                <InfoTag label="Condicao" value={condition} />
              </div>
              {/* Alertas observados */}
              {(form?.noiseObserved || form?.heatingObserved || form?.vibrationObserved) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {form?.noiseObserved && (
                    <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                      Ruido anormal
                    </span>
                  )}
                  {form?.heatingObserved && (
                    <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                      Aquecimento excessivo
                    </span>
                  )}
                  {form?.vibrationObserved && (
                    <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                      Vibracao excessiva
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CARD 2: METRICAS ENERGETICAS ── */}
        {(analysis.estimatedConsumptionMonthlyKwh || analysis.estimatedCo2MonthlyKg || analysis.estimatedConsumptionReductionPct) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados Energeticos Estimados</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-lg font-black text-gray-900">{fmt(analysis.estimatedConsumptionMonthlyKwh)}</p>
                <p className="text-xs text-gray-400">kWh/mes</p>
              </div>
              <div className="text-center">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <Leaf className="w-4 h-4 text-[#00B140]" />
                </div>
                <p className="text-lg font-black text-gray-900">{fmt(analysis.estimatedCo2MonthlyKg, 0)}</p>
                <p className="text-xs text-gray-400">kg CO2/mes</p>
              </div>
              <div className="text-center">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <TrendingDown className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-lg font-black text-gray-900">{fmt(analysis.estimatedConsumptionReductionPct, 0)}%</p>
                <p className="text-xs text-gray-400">redução possivel</p>
              </div>
            </div>
          </div>
        )}

        {/* ── CARD 3: ACAO DE AUTOMACAO ── */}
        {topRec && ap && (
          <div className={`bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden border-t-4 ${ap.cardBorder}`}>
            <div className={`px-6 py-4 ${ap.headerBg} border-b ${ap.headerBorder}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#007A33]" />
                  <div>
                    <p className="text-xs font-bold text-[#007A33] uppercase tracking-widest leading-none mb-0.5">
                      Para Automatizar esta Máquina
                    </p>
                    <p className="text-xs text-gray-500">Recomendação principal da IA</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${ap.badge}`}>
                  {ap.label}
                </span>
              </div>
            </div>
            <div className="px-6 pt-5 pb-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">{topRec.category}</p>
              <h3 className="text-xl font-black text-gray-900 leading-snug mb-2">{topRec.item}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{topRec.description}</p>

              <div className="flex items-center gap-1.5 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#00B140]" />
                <p className="text-xs text-[#007A33] font-medium">
                  Baseado em padrões de maquinas similares analisadas pela IA
                </p>
              </div>

              {/* Metricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(analysis.estimatedConsumptionReductionPct ?? 0) > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-2xl font-black text-[#00B140]">{fmt(analysis.estimatedConsumptionReductionPct, 0)}%</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">redução no consumo</p>
                  </div>
                )}
                {(analysis.estimatedMonthlySavingsBrl ?? 0) > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-lg font-black text-[#00B140] leading-tight">{brl(analysis.estimatedMonthlySavingsBrl)}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">economia por mes</p>
                  </div>
                )}
                {(analysis.estimatedRoiMonths ?? 0) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-2xl font-black text-gray-800">{fmt(analysis.estimatedRoiMonths, 0)} m</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">retorno do invest.</p>
                  </div>
                )}
                {topRec.estimatedCostBrl && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-lg font-black text-gray-700 leading-tight">{brl(topRec.estimatedCostBrl)}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">custo estimado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ações adicionais */}
            {(analysis.retrofitRecommendations?.length ?? 0) > 1 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Outras ações recomendadas
                </p>
                <div className="space-y-2">
                  {analysis.retrofitRecommendations!.slice(1).map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-black text-gray-500">{i + 2}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{rec.item}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{rec.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: PROBLEMAS ENCONTRADOS ── */}
        {problems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Problemas Encontrados</p>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {problems.map((problem, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CARD 5: RESUMO DA IA ── */}
        {analysis.aiSummary && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumo Técnico da IA</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">{analysis.aiSummary}</p>
            </div>
          </div>
        )}

        {/* ── CARD 6: CONFIRMACAO DO TIPO DA MAQUINA (apenas no modo texto) ── */}
        {scanMode === "text" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirme o Tipo da Máquina</p>
              <p className="text-xs text-gray-500 mt-1">
                Selecione qual opcao melhor descreve o equipamento analisado para salvar no acervo
              </p>
            </div>
            <div className="p-4 space-y-3">
              {analysis.machineSuggestions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
                  <AlertTriangle className="w-8 h-8" />
                  <p className="text-sm">Nenhuma sugestao gerada. Tente com mais informacoes.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/scan")}>Voltar para Análise</Button>
                </div>
              ) : (
                analysis.machineSuggestions.map((suggestion, idx) => {
                  const conf = confidenceConfig[suggestion.confidence] ?? confidenceConfig.low;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelected(idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selected === idx
                          ? "border-[#00B140] bg-green-50 shadow-sm"
                          : "border-gray-100 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          {selected === idx
                            ? <CheckCircle className="w-5 h-5 text-[#00B140] shrink-0 mt-0.5" />
                            : <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 mt-0.5" />
                          }
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 leading-snug">{suggestion.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{suggestion.description}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg border shrink-0 ${conf.color}`}>
                          {conf.label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Nota informativa */}
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#00B140] shrink-0 mt-0.5" />
          <p className="text-xs text-[#007A33] leading-relaxed">
            Ao confirmar, o plano completo de retrofit, recomendações de monitoramento IoT e o relatorio BNDES serao gerados e ficam disponiveis na ficha do equipamento.
          </p>
        </div>

        {/* Botoes */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/scan")}
            className="flex-1 h-11 border-gray-300 text-gray-700 hover:border-[#00B140] hover:text-[#00B140] rounded-lg"
          >
            Analisar Novamente
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected === null || confirmAnalysis.isPending}
            className="flex-1 h-11 bg-[#00B140] hover:bg-[#007A33] text-white font-semibold rounded-lg gap-2"
          >
            {confirmAnalysis.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <>Confirmar e Salvar no Acervo <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
