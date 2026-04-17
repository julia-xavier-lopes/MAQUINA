import { useState } from "react";
import { useLocation } from "wouter";
import { useListEquipment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, MapPin, Zap, Leaf, Factory, Hash, X, ClipboardList } from "lucide-react";
import type { Equipment } from "@workspace/api-client-react";

function EfficiencyBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-full">Nao analisado</span>;
  const map: Record<string, { label: string; className: string }> = {
    inefficient: { label: "Ineficiente",  className: "bg-red-500 text-white" },
    average:     { label: "Efic. Media",  className: "bg-amber-400 text-white" },
    optimized:   { label: "Otimizado",    className: "bg-[#00B140] text-white" },
  };
  const b = map[level];
  if (!b) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${b.className}`}>
      {b.label}
    </span>
  );
}

function RetrofitBadge({ status }: { status?: string | null }) {
  if (!status || status === "not_needed") return null;
  const map: Record<string, { label: string; className: string }> = {
    pending:     { label: "Retrofit Pendente", className: "bg-amber-50 text-amber-700 border-amber-200" },
    in_progress: { label: "Em Andamento",      className: "bg-blue-50 text-blue-700 border-blue-200"   },
    completed:   { label: "Concluido",          className: "bg-green-50 text-green-700 border-green-200" },
  };
  const b = map[status];
  if (!b) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${b.className}`}>
      {b.label}
    </span>
  );
}

function LogisticsCodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#007A33] bg-green-50 border border-green-200 px-2 py-0.5 rounded-md w-fit">
      <Hash className="w-3 h-3" />
      {code}
    </div>
  );
}

function EquipmentCard({ eq }: { eq: Equipment }) {
  const [, navigate] = useLocation();
  return (
    <div
      onClick={() => navigate(`/equipment/${eq.id}`)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#00B140]/30 transition-all cursor-pointer overflow-hidden group"
    >
      <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
        {eq.imageUrl ? (
          <img src={eq.imageUrl} alt={eq.name} className="w-full h-full object-cover" />
        ) : (
          <Factory className="w-10 h-10 text-gray-200 group-hover:text-gray-300 transition-colors" />
        )}
        <div className="absolute top-2 right-2">
          <EfficiencyBadge level={eq.efficiencyLevel} />
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {/* Código logístico — destaque no topo */}
        <LogisticsCodeBadge code={(eq as Equipment & { logisticsCode?: string }).logisticsCode} />

        <div>
          <h3 className="font-bold text-[#333333] text-sm leading-tight">{eq.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{[eq.brand, eq.model].filter(Boolean).join(" · ")}</p>
        </div>

        {(eq.sector || eq.location) && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{[eq.sector, eq.location].filter(Boolean).join(" — ")}</span>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {eq.estimatedConsumptionMonthlyKwh && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3 h-3 text-amber-500" />
              {eq.estimatedConsumptionMonthlyKwh.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh/mes
            </div>
          )}
          {eq.estimatedCo2MonthlyKg && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Leaf className="w-3 h-3 text-green-500" />
              {eq.estimatedCo2MonthlyKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg CO₂
            </div>
          )}
        </div>

        <RetrofitBadge status={eq.retrofitStatus} />
      </div>
    </div>
  );
}

export default function EquipmentList() {
  const [, navigate] = useLocation();
  const [search, setSearch]       = useState("");
  const [efficiency, setEfficiency] = useState("all");

  const { data: equipment, isLoading } = useListEquipment({
    search:     search || undefined,
    efficiency: efficiency !== "all" ? efficiency as "inefficient" | "average" | "optimized" : undefined,
  });

  const hasFilters = search || efficiency !== "all";

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Factory className="w-4 h-4 text-[#00B140]" />
            <p className="text-xs font-bold text-[#007A33] uppercase tracking-widest">Inventario</p>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Acervo de Equipamentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão inteligente dos ativos industriais</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/equipment/register")}
            className="gap-2 font-semibold border-[#007A33] text-[#007A33] hover:bg-green-50"
          >
            <ClipboardList className="w-4 h-4" /> Cadastrar Máquina
          </Button>
          <Button onClick={() => navigate("/scan")} className="bg-[#00B140] hover:bg-[#007A33] text-white gap-2 font-semibold">
            <Plus className="w-4 h-4" /> Diagnóstico IA
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, codigo (ex: PRO-MOT-0001), setor, tipo, marca, localização..."
            className="pl-9 pr-8 text-sm font-mono placeholder:font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Filtrar por:</p>
          <Select value={efficiency} onValueChange={setEfficiency}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Eficiência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os niveis</SelectItem>
              <SelectItem value="inefficient">Ineficiente</SelectItem>
              <SelectItem value="average">Eficiência Media</SelectItem>
              <SelectItem value="optimized">Otimizado</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setEfficiency("all"); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200 hover:border-red-200 transition-colors"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Dica de busca por código */}
        <div className="flex items-start gap-2 p-2.5 bg-green-50 border border-green-100 rounded-lg">
          <Hash className="w-3.5 h-3.5 text-[#00B140] mt-0.5 shrink-0" />
          <p className="text-xs text-[#007A33] leading-relaxed">
            <strong>Codigo logistico:</strong> cada máquina tem um codigo unico no formato{" "}
            <span className="font-mono font-bold">SETOR-TIPO-XXXX</span>{" "}
            (ex: <span className="font-mono">PRO-MOT-0001</span>). Busque por qualquer parte do codigo, setor ou tipo de equipamento.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#00B140]" />
        </div>
      ) : !equipment?.length ? (
        <div className="flex flex-col items-center gap-4 py-20 text-gray-400">
          <Factory className="w-16 h-16" />
          <div className="text-center">
            <p className="font-medium text-gray-500">
              {hasFilters ? "Nenhum equipamento encontrado para esta busca" : "Nenhum equipamento cadastrado"}
            </p>
            <p className="text-sm mt-1">
              {hasFilters
                ? "Tente outros termos ou limpe os filtros"
                : "Escaneie sua primeira máquina para comecar"}
            </p>
          </div>
          {hasFilters ? (
            <Button variant="outline" onClick={() => { setSearch(""); setEfficiency("all"); }}>
              Limpar filtros
            </Button>
          ) : (
            <Button onClick={() => navigate("/scan")} className="bg-[#00B140] hover:bg-[#007A33] text-white mt-2">
              Escanear Máquina
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            {equipment.length} equipamento{equipment.length !== 1 ? "s" : ""} encontrado{equipment.length !== 1 ? "s" : ""}
            {hasFilters && <span className="ml-1">para a busca atual</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {equipment.map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
          </div>
        </>
      )}
    </div>
    </div>
  );
}
