import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Wifi, Activity, AlertTriangle, Leaf, Factory,
  MapPin, Zap, ChevronRight, Cpu, Calculator, Sparkles,
} from "lucide-react";

interface EquipmentEmission {
  id: number;
  name: string;
  type: string;
  brand: string;
  model: string;
  logisticsCode: string | null;
  sector: string;
  location: string;
  efficiencyLevel: string;
  measurementSource: string;
  co2MonthlyKg: number;
  co2HourlyKg: number;
  co2PerSecondKg: number;
  hoursPerDay: number;
  powerKw: number;
}

interface SectorData { sector: string; co2MonthlyKg: number; percentage: number }
interface LocationData { location: string; co2MonthlyKg: number; percentage: number }

interface EmissionsData {
  totalCo2MonthlyKg: number;
  totalCo2HourlyKg: number;
  totalCo2PerSecondKg: number;
  totalCo2AnnualTons: number;
  equipmentCount: number;
  bySector: SectorData[];
  byLocation: LocationData[];
  equipment: EquipmentEmission[];
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function secondsSinceMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return (now.getTime() - midnight.getTime()) / 1000;
}

function todayAccumulated(eq: EquipmentEmission): number {
  const s = secondsSinceMidnight();
  const runFraction = Math.min(eq.hoursPerDay / 24, 1);
  return s * eq.co2PerSecondKg * runFraction;
}

function fmtKg(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ton`;
  if (v >= 1)    return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
  return `${(v * 1000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} g`;
}

function fmtRate(perSec: number): string {
  if (perSec >= 1)         return `${perSec.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg/s`;
  if (perSec * 1000 >= 1) return `${(perSec * 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g/s`;
  return `${(perSec * 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mg/s`;
}

const efficiencyColors: Record<string, string> = {
  inefficient: "bg-red-100 text-red-700 border-red-200",
  average:     "bg-amber-100 text-amber-700 border-amber-200",
  optimized:   "bg-green-100 text-green-700 border-green-200",
};
const efficiencyLabels: Record<string, string> = {
  inefficient: "Ineficiente",
  average:     "Media",
  optimized:   "Otimizado",
};

function SourceBadge({ source }: { source: string }) {
  if (source === "sensor") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
        <Wifi className="w-3 h-3" /> Sensor Instalado
      </span>
    );
  }
  if (source === "calculado") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700">
        <Calculator className="w-3 h-3" /> Medicao Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500">
      <Sparkles className="w-3 h-3" /> Estimativa IA
    </span>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

function LiveCounter({ co2PerSecond, initialKg }: { co2PerSecond: number; initialKg: number }) {
  const [value, setValue] = useState(initialKg);
  const ref = useRef(initialKg);
  useEffect(() => {
    ref.current = initialKg;
    setValue(initialKg);
  }, [initialKg]);
  useEffect(() => {
    if (co2PerSecond <= 0) return;
    const id = setInterval(() => {
      ref.current += co2PerSecond;
      setValue(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, [co2PerSecond]);
  return <span>{fmtKg(value)}</span>;
}

function SourceSelector({ equipmentId, current, onChanged }: { equipmentId: number; current: string; onChanged: (src: string) => void }) {
  const [saving, setSaving] = useState(false);

  async function handleChange(src: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/emissions/equipment/${equipmentId}/source`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measurementSource: src }),
      });
      onChanged(src);
    } finally {
      setSaving(false);
    }
  }

  const options = [
    { value: "estimado",  label: "Estimativa IA",    icon: <Sparkles className="w-3 h-3" /> },
    { value: "sensor",    label: "Sensor Instalado", icon: <Wifi className="w-3 h-3" /> },
    { value: "calculado", label: "Medicao Manual",   icon: <Calculator className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={saving}
          onClick={() => handleChange(opt.value)}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
            current === opt.value
              ? opt.value === "sensor"    ? "bg-blue-600 text-white border-blue-600"
              : opt.value === "calculado" ? "bg-orange-500 text-white border-orange-500"
              : "bg-gray-700 text-white border-gray-700"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EmissionsPanel() {
  const [data, setData]             = useState<EmissionsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [sources, setSources]       = useState<Record<number, string>>({});
  const [totalToday, setTotalToday] = useState(0);
  const totalRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/emissions/realtime`, {
        headers: { "Cache-Control": "no-store" },
      });
      if (!r.ok) throw new Error("Erro ao carregar dados");
      const json = await r.json() as EmissionsData;
      setData(json);
      const src: Record<number, string> = {};
      for (const eq of json.equipment) src[eq.id] = eq.measurementSource;
      setSources(src);

      const todayInitial = json.equipment.reduce((s, eq) => s + todayAccumulated(eq), 0);
      totalRef.current = todayInitial;
      setTotalToday(todayInitial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      totalRef.current += data.totalCo2PerSecondKg;
      setTotalToday(totalRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [data]);

  if (loading) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-[#00B140] mx-auto animate-pulse mb-3" />
          <p className="text-sm text-gray-500">Carregando dados de emissão...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{error ?? "Sem dados"}</p>
        </div>
      </div>
    );
  }

  if (data.equipmentCount === 0) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <Leaf className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">Nenhum equipamento cadastrado</h2>
          <p className="text-sm text-gray-400 mb-6">Cadastre maquinas pelo Diagnóstico IA para monitorar as emissões em tempo real.</p>
          <Link href="/scan">
            <button className="bg-[#00B140] hover:bg-[#007A33] text-white text-sm font-semibold px-6 py-2.5 transition-colors">
              Analisar Máquina
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const annualTons = (totalToday / 1000) * 365;

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-5">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PulseDot />
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Ao vivo</p>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Emissões em Tempo Real</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoramento de CO₂ por setor, sede e maquinario — acumulado desde meia-noite de hoje
          </p>
        </div>

        {/* Hero total */}
        <div className="bg-[#007A33] rounded-xl overflow-hidden shadow-lg">
          {/* Linha principal: contador ao vivo */}
          <div className="px-6 pt-6 pb-4 grid md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-xs font-bold text-green-200 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                </span>
                Emissão em Tempo Real — Hoje
              </p>
              <div className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight">
                <LiveCounter co2PerSecond={data.totalCo2PerSecondKg} initialKg={totalToday} />
              </div>
              <p className="text-green-200 text-xs mt-1.5">
                CO₂ acumulado desde 00:00 · {fmtRate(data.totalCo2PerSecondKg)} agora
              </p>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-green-700 md:pl-6 pt-4 md:pt-0">
              <p className="text-xs font-bold text-green-200 uppercase tracking-widest mb-1">Referencia Mensal</p>
              <div className="text-2xl font-black text-green-100 tabular-nums">
                {data.totalCo2MonthlyKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                <span className="text-base font-semibold ml-1.5">kg/mês</span>
              </div>
              <p className="text-green-300 text-xs mt-1">
                {(data.totalCo2AnnualTons).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ton CO₂/ano · ver Dashboard ESG
              </p>
            </div>
          </div>
          <div className="border-t border-green-700 px-6 py-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-green-300 text-xs">Taxa atual</p>
              <p className="text-white font-bold text-sm">{fmtRate(data.totalCo2PerSecondKg)}</p>
            </div>
            <div>
              <p className="text-green-300 text-xs">Projecao anual</p>
              <p className="text-white font-bold text-sm">{(data.totalCo2AnnualTons).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ton CO₂</p>
            </div>
            <div>
              <p className="text-green-300 text-xs">Máquinas monitoradas</p>
              <p className="text-white font-bold text-sm">{data.equipmentCount} ativas</p>
            </div>
          </div>
        </div>

        {/* Por Setor e Por Sede */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Por Setor */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Factory className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Emissão por Setor</p>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              {data.bySector.length === 0 && <p className="text-xs text-gray-400">Sem dados por setor</p>}
              {data.bySector.map((s) => (
                <div key={s.sector}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{s.sector}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">
                      {s.co2MonthlyKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#00B140] h-2 rounded-full transition-all duration-700"
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#007A33] w-8 text-right">{s.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por Sede */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Emissão por Sede / Local</p>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              {data.byLocation.length === 0 && <p className="text-xs text-gray-400">Sem dados por local</p>}
              {data.byLocation.map((l) => (
                <div key={l.location}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{l.location}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">
                      {l.co2MonthlyKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg/mes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#007A33] h-2 rounded-full transition-all duration-700"
                        style={{ width: `${l.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#007A33] w-8 text-right">{l.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de maquinario */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Maquinário — Emissão por Equipamento</p>
          </div>
          <div className="space-y-3">
            {data.equipment.map((eq) => {
              const eqInitial = todayAccumulated(eq);
              const currentSource = sources[eq.id] ?? eq.measurementSource;
              const eff = efficiencyColors[eq.efficiencyLevel] ?? efficiencyColors.average;
              const effLabel = efficiencyLabels[eq.efficiencyLevel] ?? "Media";
              const hasEmissions = eq.co2MonthlyKg > 0;

              return (
                <div
                  key={eq.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          {hasEmissions && <PulseDot />}
                          <h3 className="font-bold text-gray-900 text-sm">{eq.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${eff}`}>
                            {effLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {eq.type}{eq.brand ? ` · ${eq.brand}` : ""}{eq.model ? ` ${eq.model}` : ""}
                          {eq.logisticsCode ? ` · ${eq.logisticsCode}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Factory className="w-3 h-3" />{eq.sector}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{eq.location}
                          </p>
                          {eq.powerKw > 0 && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Zap className="w-3 h-3" />{eq.powerKw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live CO2 */}
                      <div className="text-right shrink-0">
                        {hasEmissions ? (
                          <>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Emitido hoje</p>
                            <p className="text-lg font-black text-gray-900 tabular-nums leading-none">
                              <LiveCounter co2PerSecond={eq.co2PerSecondKg} initialKg={eqInitial} />
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {fmtRate(eq.co2PerSecondKg)} · {eq.co2MonthlyKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg/mes
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-300 italic">Sem dados CO₂</p>
                        )}
                      </div>
                    </div>

                    {/* Fonte da medicao */}
                    <div className="border-t border-gray-50 pt-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 font-semibold">
                        Fonte desta medicao:
                      </p>
                      <SourceSelector
                        equipmentId={eq.id}
                        current={currentSource}
                        onChanged={(src) => setSources((prev) => ({ ...prev, [eq.id]: src }))}
                      />
                    </div>
                  </div>

                  <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Projecao anual: <span className="font-semibold text-gray-600">
                        {((eq.co2MonthlyKg * 12) / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ton CO₂
                      </span>
                    </p>
                    <Link href={`/equipment/${eq.id}`}>
                      <button className="text-xs text-[#007A33] font-semibold flex items-center gap-1 hover:underline">
                        Ver detalhe <ChevronRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
