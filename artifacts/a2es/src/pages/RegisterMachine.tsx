import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEquipment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Factory, Loader2, CheckCircle } from "lucide-react";

const SETORES = [
  "Produção", "Manufatura", "Logística", "Utilidades", "Manutenção",
  "Qualidade", "Administração", "Outro",
];

const TIPOS = [
  "Motor Elétrico", "Compressor", "Bomba Hidráulica", "Prensa",
  "Esteira Transportadora", "Ventilador / Exaustor", "Caldeira",
  "Transformador", "Gerador", "Forno Industrial", "Outro",
];

const CONDICOES = ["Excelente", "Bom", "Regular", "Degradado", "Crítico"];

export default function RegisterMachine() {
  const [, navigate] = useLocation();
  const createEquipment = useCreateEquipment();

  const [form, setForm] = useState({
    name: "",
    type: "",
    brand: "",
    model: "",
    yearManufactured: "",
    sector: "",
    location: "",
    power: "",
    voltage: "",
    current: "",
    hoursPerDay: "",
    daysPerWeek: "",
    apparentCondition: "",
    operatorNotes: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    await createEquipment.mutateAsync({
      name: form.name.trim(),
      type: form.type || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      yearManufactured: form.yearManufactured ? parseInt(form.yearManufactured) : undefined,
      sector: form.sector || undefined,
      location: form.location || undefined,
      power: form.power || undefined,
      voltage: form.voltage || undefined,
      current: form.current || undefined,
      hoursPerDay: form.hoursPerDay ? parseFloat(form.hoursPerDay) : undefined,
      daysPerWeek: form.daysPerWeek ? parseInt(form.daysPerWeek) : undefined,
      apparentCondition: form.apparentCondition || undefined,
      operatorNotes: form.operatorNotes || undefined,
    });

    navigate("/equipment");
  };

  const isLoading = createEquipment.isPending;

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Voltar */}
        <button
          onClick={() => navigate("/equipment")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00B140] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Acervo
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00B140] flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#007A33] uppercase tracking-widest mb-0.5">Acervo · Novo Equipamento</p>
            <h1 className="text-2xl font-black text-gray-900">Cadastrar Máquina</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registre um equipamento diretamente, sem análise de IA</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            Apenas o <strong>nome</strong> é obrigatório. Preencha os demais campos conforme disponível.
            O diagnóstico de IA pode ser realizado depois através do <strong>Diagnóstico IA</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identificação */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#00B140]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identificação</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Nome da Máquina <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ex: Motor Ventilador Linha 3"
                  required
                  className="h-10"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tipo de Equipamento</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Marca</Label>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="ex: Siemens, WEG, ABB..." className="h-10" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Modelo</Label>
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="ex: 1LA7 180-4AA" className="h-10" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Ano de Fabricação</Label>
                <Input
                  type="number"
                  value={form.yearManufactured}
                  onChange={(e) => set("yearManufactured", e.target.value)}
                  placeholder="ex: 2018"
                  min={1950}
                  max={new Date().getFullYear()}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#00B140]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localização</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Setor</Label>
                <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Localização Física</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="ex: Galpão B, Linha 3" className="h-10" />
              </div>
            </div>
          </div>

          {/* Dados técnicos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#00B140]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados Elétricos e Operacionais</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Potência (kW)</Label>
                <Input type="number" value={form.power} onChange={(e) => set("power", e.target.value)} placeholder="ex: 15" step="0.1" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tensão (V)</Label>
                <Input type="number" value={form.voltage} onChange={(e) => set("voltage", e.target.value)} placeholder="ex: 380" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Corrente (A)</Label>
                <Input type="number" value={form.current} onChange={(e) => set("current", e.target.value)} placeholder="ex: 28.5" step="0.1" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Horas de Uso / Dia</Label>
                <Input type="number" value={form.hoursPerDay} onChange={(e) => set("hoursPerDay", e.target.value)} placeholder="ex: 8" step="0.5" min={0} max={24} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Dias de Operação / Semana</Label>
                <Input type="number" value={form.daysPerWeek} onChange={(e) => set("daysPerWeek", e.target.value)} placeholder="ex: 5" min={1} max={7} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Condição Aparente</Label>
                <Select value={form.apparentCondition} onValueChange={(v) => set("apparentCondition", v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#00B140]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações do Operador</p>
            </div>
            <div className="px-6 py-5">
              <Textarea
                value={form.operatorNotes}
                onChange={(e) => set("operatorNotes", e.target.value)}
                placeholder="Descreva quaisquer particularidades, comportamentos anormais ou informações relevantes sobre esta máquina..."
                rows={4}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/equipment")}
              className="flex-1 h-11 border-gray-300 text-gray-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.name.trim() || isLoading}
              className="flex-1 h-11 bg-[#00B140] hover:bg-[#007A33] text-white font-bold gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Cadastrar Máquina</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
