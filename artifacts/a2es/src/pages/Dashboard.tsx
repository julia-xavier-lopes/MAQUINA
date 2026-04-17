import { useGetDashboardSummary, useGetEsgMetrics, useGetRetrofitPriorities } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2, BarChart2, Leaf, Cpu, TrendingDown, Zap, DollarSign, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const GREEN_DARK  = "#005B2A";
const GREEN_MID   = "#00B140";
const GREEN_LIGHT = "#007A33";

function DonutSVG({ data }: { data: { name: string; value: number; fill: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const size = 160; const cx = 80; const cy = 80; const R = 68; const ri = 42;
  let a = -Math.PI / 2;
  const slices = data.map((d) => {
    const da = (d.value / total) * 2 * Math.PI;
    const ea = a + da;
    const path = [
      `M ${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)}`,
      `A ${R} ${R} 0 ${da > Math.PI ? 1 : 0} 1 ${cx + R * Math.cos(ea)} ${cy + R * Math.sin(ea)}`,
      `L ${cx + ri * Math.cos(ea)} ${cy + ri * Math.sin(ea)}`,
      `A ${ri} ${ri} 0 ${da > Math.PI ? 1 : 0} 0 ${cx + ri * Math.cos(a)} ${cy + ri * Math.sin(a)} Z`,
    ].join(" ");
    const ma = a + da / 2;
    const lx = cx + ((R + ri) / 2) * Math.cos(ma);
    const ly = cy + ((R + ri) / 2) * Math.sin(ma);
    const pct = Math.round((d.value / total) * 100);
    a = ea;
    return { ...d, path, lx, ly, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.fill} />
          {s.pct >= 10 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="bold">
              {s.pct}%
            </text>
          )}
        </g>
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" fill={GREEN_DARK} fontSize="22" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central" fill="#888" fontSize="9">equipamentos</text>
    </svg>
  );
}

function Legend({ items }: { items: { name: string; value: number; fill: string; pct: number }[] }) {
  return (
    <div className="space-y-1.5 mt-3">
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: it.fill }} />
          <span className="flex-1 text-gray-700">{it.name}</span>
          <span className="font-bold tabular-nums" style={{ color: it.fill }}>{it.pct}%</span>
          <span className="text-gray-400 w-6 text-right">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

const EFFICIENCY_COLORS: Record<string, string> = {
  Ineficiente: "#C0392B",
  Media:       "#FACC15",
  Otimizado:   "#059669",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: summary, isLoading: loadingS } = useGetDashboardSummary();
  const { data: esgMetrics, isLoading: loadingE } = useGetEsgMetrics();
  const { data: priorities, isLoading: loadingP } = useGetRetrofitPriorities();

  if (loadingS || loadingE || loadingP) return (
    <div className="bg-[#F5F5F5] min-h-screen flex justify-center items-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN_MID }} />
    </div>
  );

  const efficiencyData = summary ? [
    { name: "Ineficiente", value: summary.inefficientCount, fill: EFFICIENCY_COLORS.Ineficiente },
    { name: "Media",       value: summary.averageCount,     fill: EFFICIENCY_COLORS.Media       },
    { name: "Otimizado",   value: summary.optimizedCount,   fill: EFFICIENCY_COLORS.Otimizado   },
  ].filter(d => d.value > 0) : [];

  const total = efficiencyData.reduce((s, d) => s + d.value, 0);
  const legendItems = efficiencyData.map(d => ({ ...d, pct: total > 0 ? Math.round((d.value / total) * 100) : 0 }));

  const coTotalTon = summary ? ((summary.totalCo2MonthlyKg * 12) / 1000) : null;
  const coReductionTon = summary ? ((summary.totalCo2ReductionPotentialKg * 12) / 1000) : null;

  const conformanceData = summary ? [
    { name: "Ineficientes", value: summary.inefficientCount, fill: "#C0392B" },
    { name: "Em processo",  value: summary.averageCount,     fill: "#FACC15" },
    { name: "Otimizados",   value: summary.optimizedCount,   fill: "#059669" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dashboard ESG</h1>
            <p className="text-sm text-gray-500 mt-1">
              Inventário de Emissões de GEE · GHG Protocol · ISO 14064-1 · Atualizado em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#007A33] uppercase tracking-widest bg-green-50 border border-green-200 px-2 py-1 rounded">
              Atualizado em tempo real
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Emissão Anual Estimada", value: coTotalTon,                              unit: "tCO₂/ano",  icon: Leaf,         color: "#C0392B" },
            { label: "Potencial de Redução",   value: coReductionTon,                          unit: "tCO₂ reduz.", icon: TrendingDown, color: GREEN_MID },
            { label: "Consumo Mensal",          value: summary?.totalConsumptionMonthlyKwh,    unit: "kWh/mês",   icon: Zap,          color: "#EAB308" },
            { label: "Economia Identificada",   value: summary?.totalPotentialSavingsBrl,      unit: "R$/mês",    icon: DollarSign,   color: GREEN_LIGHT },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
                </div>
                <p className="text-2xl font-black tabular-nums" style={{ color }}>
                  {value != null ? value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{unit}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fila 1: Distribuicao + Status ESG */}
        <div className="grid md:grid-cols-3 gap-4">

          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#333333] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-400" /> Distribuição de Eficiência
              </CardTitle>
            </CardHeader>
            <CardContent>
              {efficiencyData.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Nenhum dado disponível</p>
              ) : (
                <div className="flex flex-col items-center">
                  <DonutSVG data={efficiencyData} />
                  <Legend items={legendItems} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#333333] flex items-center gap-2">
                <Factory className="w-4 h-4 text-gray-400" /> Status Operacional e Conformidade ESG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {summary && [
                  { label: "Total de Ativos",    value: summary.totalEquipment,       unit: "equipamentos",   color: GREEN_DARK  },
                  { label: "Analisados por IA",  value: summary.analyzedCount,        unit: "laudos gerados", color: GREEN_LIGHT },
                  { label: "Retrofit Pendente",  value: summary.pendingRetrofitCount, unit: "equipamentos",   color: "#EAB308"   },
                  { label: "Já Otimizados",      value: summary.optimizedCount,       unit: "equipamentos",   color: "#059669"   },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color }}>{value}</p>
                    <p className="text-[10px] text-gray-400">{unit}</p>
                  </div>
                ))}
              </div>

              {conformanceData.length > 0 && (() => {
                const confTotal = conformanceData.reduce((s, d) => s + d.value, 0);
                return (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Distribuição por Conformidade ESG</p>
                    <div className="flex h-6 rounded-lg overflow-hidden w-full mb-2">
                      {conformanceData.map((d) => (
                        <div
                          key={d.name}
                          style={{ width: `${(d.value / confTotal) * 100}%`, backgroundColor: d.fill }}
                          className="flex items-center justify-center text-[9px] font-black text-white"
                        >
                          {Math.round((d.value / confTotal) * 100)}%
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {conformanceData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                          <span className="text-gray-500">{d.name}</span>
                          <span className="font-bold" style={{ color: d.fill }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Fila 2: gráficos */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#333333]">Tendência de CO₂ — Últimos 6 Meses (kg/mês)</CardTitle>
            </CardHeader>
            <CardContent>
              {!esgMetrics?.length ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sem dados históricos</p>
              ) : (
                <>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={esgMetrics} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString("pt-BR")} />
                        <Tooltip
                          formatter={(val: number) => [`${val.toLocaleString("pt-BR")} kg`, "CO₂"]}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Line type="monotone" dataKey="co2Kg" stroke={GREEN_MID} strokeWidth={2.5}
                          dot={{ r: 3, fill: GREEN_MID }} name="CO₂ (kg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                    Projeção retroativa com base no inventário atual.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#333333]">Consumo Energético Mensal (kWh)</CardTitle>
            </CardHeader>
            <CardContent>
              {!esgMetrics?.length ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sem dados</p>
              ) : (
                <div style={{ height: 218 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={esgMetrics} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString("pt-BR")} />
                      <Tooltip
                        formatter={(val: number) => [`${val.toLocaleString("pt-BR")} kWh`, "Consumo"]}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="consumptionKwh" fill={GREEN_MID} radius={[3, 3, 0, 0]} name="Consumo (kWh)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prioridades de retrofit */}
        {priorities && priorities.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#333333] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" /> Prioridades para Retrofit e Descarbonização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">#</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">Equipamento</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">Status</th>
                      <th className="text-right py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">CO₂ red./mês</th>
                      <th className="text-right py-2 text-gray-400 font-semibold uppercase tracking-wide">Economia R$/mês</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorities.map((p, i) => (
                      <tr
                        key={p.equipmentId}
                        onClick={() => navigate(`/equipment/${p.equipmentId}`)}
                        className="border-b border-gray-100 hover:bg-green-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ backgroundColor: i < 3 ? "#C0392B" : GREEN_LIGHT }}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-gray-800 max-w-[180px] truncate">{p.name}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            p.efficiencyLevel === "inefficient"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {p.efficiencyLevel === "inefficient" ? "Ineficiente" : "Efic. Média"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-bold" style={{ color: GREEN_LIGHT }}>
                          {p.co2ReductionKg.toFixed(1)} kg
                        </td>
                        <td className="py-2.5 text-right font-bold text-gray-800">
                          {p.estimatedSavingsBrl > 0
                            ? `R$ ${p.estimatedSavingsBrl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-[10px] text-gray-400 text-center pb-2">
          MaquinAI — Plataforma de Descarbonização Industrial para PMEs Brasileiras · Dados calculados via IA com base nos laudos técnicos cadastrados
        </p>
      </div>
    </div>
  );
}
