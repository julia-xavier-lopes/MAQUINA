import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateEquipment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Camera, FileText, Loader2, Cpu, AlertCircle, CheckCircle2, SwitchCamera, X, ZapIcon } from "lucide-react";

type TabType = "image" | "text";

const PROGRESS_STEPS = [
  "Iniciando análise...",
  "Processando dados do equipamento...",
  "Analisando imagem com visão computacional...",
  "Consultando base de conhecimento industrial...",
  "Gerando diagnóstico de eficiência...",
  "Salvando resultado...",
  "Concluído",
];

export default function Scan() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("image");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [equipmentData, setEquipmentData] = useState({
    type: "", brand: "", model: "", yearManufactured: "", voltage: "", current: "",
    power: "", color: "", size: "", hoursPerDay: "", daysPerWeek: "",
    maxConsumptionKwh: "",
    sector: "", location: "", apparentCondition: "", operatorNotes: "",
    noiseObserved: false, heatingObserved: false, vibrationObserved: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Camera state
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createEquipment = useCreateEquipment();

  // Attach stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [cameraStream]);

  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setFacingMode(facing);
      setCameraStream(stream);
      setCameraMode(true);
    } catch {
      setCameraMode(false);
      setCameraError(null);
      // Fallback: open camera via input capture attribute
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraMode(false);
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    startCamera(next);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const preview = canvas.toDataURL("image/jpeg", 0.88);
    const base64 = preview.split(",")[1];
    setImageBase64(base64);
    setImageMimeType("image/jpeg");
    setImagePreview(preview);
    stopCamera();
    setError(null);
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2600);
  };

  const compressImage = (file: File): Promise<{ base64: string; mimeType: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIMENSION = 1280;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION; }
          else { width = Math.round((width * MAX_DIMENSION) / height); height = MAX_DIMENSION; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        const preview = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = preview.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg", preview });
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType, preview } = await compressImage(file);
      setImageBase64(base64);
      setImageMimeType(mimeType);
      setImagePreview(preview);
      setError(null);
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 2600);
    } catch {
      setError("Não foi possível processar a imagem. Tente outro arquivo.");
    }
  };

  const pollJobStatus = (jobId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let lastProgress = "";
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/analysis/jobs/${jobId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const job = await res.json();
          if (job.progress && job.progress !== lastProgress) {
            lastProgress = job.progress;
            setCompletedSteps(prev => {
              if (currentProgress && !prev.includes(currentProgress)) return [...prev, currentProgress];
              return prev;
            });
            setCurrentProgress(job.progress);
          }
          if (job.status === "done") {
            clearInterval(pollRef.current!);
            localStorage.setItem("a2es_analysis", JSON.stringify(job.data));
            resolve();
          } else if (job.status === "error") {
            clearInterval(pollRef.current!);
            reject(new Error(job.error || "Falha na análise"));
          }
        } catch (err) {
          clearInterval(pollRef.current!);
          reject(err);
        }
      }, 2000);
    });
  };

  const handleAnalyze = async () => {
    setError(null);
    setCurrentProgress("");
    setCompletedSteps([]);
    if (activeTab === "image" && !imageBase64 && !textDescription) {
      setError("Envie uma imagem ou adicione uma descrição para analisar.");
      return;
    }
    if (activeTab === "text" && !textDescription) {
      setError("Adicione uma descrição da máquina para analisar.");
      return;
    }
    setIsLoading(true);
    try {
      let equipmentId: number | undefined;
      if (equipmentData.type && equipmentData.brand && equipmentData.model) {
        const eqResult = await createEquipment.mutateAsync({
          name: `${equipmentData.type} - ${equipmentData.brand} ${equipmentData.model}`,
          type: equipmentData.type || "Não especificado",
          brand: equipmentData.brand || "Não especificado",
          model: equipmentData.model || "Não especificado",
          yearManufactured: equipmentData.yearManufactured ? parseInt(equipmentData.yearManufactured) : undefined,
          voltage: equipmentData.voltage || undefined,
          current: equipmentData.current || undefined,
          power: equipmentData.power || undefined,
          color: equipmentData.color || undefined,
          size: equipmentData.size || undefined,
          hoursPerDay: equipmentData.hoursPerDay ? parseFloat(equipmentData.hoursPerDay) : undefined,
          daysPerWeek: equipmentData.daysPerWeek ? parseFloat(equipmentData.daysPerWeek) : undefined,
          sector: equipmentData.sector || undefined,
          location: equipmentData.location || undefined,
          apparentCondition: equipmentData.apparentCondition || undefined,
          operatorNotes: equipmentData.operatorNotes || undefined,
          noiseObserved: equipmentData.noiseObserved,
          heatingObserved: equipmentData.heatingObserved,
          vibrationObserved: equipmentData.vibrationObserved,
        });
        equipmentId = eqResult.id;
      }
      const payload = {
        imageBase64: imageBase64 || undefined,
        imageMimeType: imageMimeType || undefined,
        textDescription: textDescription || undefined,
        equipmentId: equipmentId ?? undefined,
        equipmentData: {
          type: equipmentData.type || undefined,
          brand: equipmentData.brand || undefined,
          model: equipmentData.model || undefined,
          yearManufactured: equipmentData.yearManufactured ? parseInt(equipmentData.yearManufactured) : undefined,
          voltage: equipmentData.voltage || undefined,
          current: equipmentData.current || undefined,
          power: equipmentData.power || undefined,
          hoursPerDay: equipmentData.hoursPerDay ? parseFloat(equipmentData.hoursPerDay) : undefined,
          daysPerWeek: equipmentData.daysPerWeek ? parseFloat(equipmentData.daysPerWeek) : undefined,
          maxConsumptionKwh: equipmentData.maxConsumptionKwh ? parseFloat(equipmentData.maxConsumptionKwh) : undefined,
          sector: equipmentData.sector || undefined,
          apparentCondition: equipmentData.apparentCondition || undefined,
          noiseObserved: equipmentData.noiseObserved,
          heatingObserved: equipmentData.heatingObserved,
          vibrationObserved: equipmentData.vibrationObserved,
          operatorNotes: equipmentData.operatorNotes || undefined,
        },
      };
      setCurrentProgress("Iniciando análise...");
      const startRes = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!startRes.ok) throw new Error(`HTTP ${startRes.status}`);
      const { jobId } = await startRes.json();
      await pollJobStatus(jobId);
      localStorage.setItem("a2es_equipment_form", JSON.stringify(equipmentData));
      localStorage.setItem("a2es_scan_mode", activeTab);
      navigate("/suggestions");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na análise. Verifique a conexão e tente novamente.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const allDisplayedSteps = [
    ...completedSteps,
    ...(currentProgress && !completedSteps.includes(currentProgress) ? [currentProgress] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5">

      <style>{`
        @keyframes scanBeam { 0% { top: -4px; } 100% { top: calc(100% + 4px); } }
        @keyframes scanGlow { 0% { top: -32px; } 100% { top: calc(100% + 32px); } }
        @keyframes cornerPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 #00B140; }
          50% { opacity: 0.7; box-shadow: 0 0 6px 2px #00B14066; }
        }
        @keyframes scanLabel {
          0%, 100% { opacity: 1; letter-spacing: 0.2em; }
          50% { opacity: 0.7; letter-spacing: 0.3em; }
        }
        @keyframes camPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,177,64,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(0,177,64,0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Diagnóstico de Máquina com IA</h1>
          <p className="text-gray-500 mt-1 text-sm">Envie uma foto ou descreva o equipamento para gerar o diagnóstico completo</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
          <Cpu className="w-3.5 h-3.5 text-[#00B140]" />
          Análise por IA Industrial
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* LEFT */}
        <div className="space-y-4">
          <Card>
            <div className="flex border-b border-gray-200 px-6 pt-2">
              <button
                onClick={() => setActiveTab("image")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "image" ? "border-[#00B140] text-[#00B140]" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Camera className="w-4 h-4" /> Foto da Máquina
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "text" ? "border-[#00B140] text-[#00B140]" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText className="w-4 h-4" /> Descrição Manual
              </button>
            </div>

            <CardContent className="pt-5">
              {/* Hidden inputs */}
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />

              <div style={{ minHeight: "280px" }} className="flex flex-col">

                {activeTab === "image" && (
                  <>
                    {/* ── CAMERA VIEWFINDER ── */}
                    {cameraMode && (
                      <div className="relative rounded-lg overflow-hidden bg-black" style={{ minHeight: "280px" }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ maxHeight: "320px", minHeight: "280px" }}
                        />

                        {/* Corner brackets */}
                        <div className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00B140] rounded-tl" />
                        <div className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00B140] rounded-tr" />
                        <div className="absolute bottom-16 left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00B140] rounded-bl" />
                        <div className="absolute bottom-16 right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00B140] rounded-br" />

                        {/* Controls overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 flex items-center justify-between">
                          {/* Flip */}
                          <button
                            onClick={flipCamera}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            title="Virar câmera"
                          >
                            <SwitchCamera className="w-5 h-5 text-white" />
                          </button>

                          {/* Capture */}
                          <button
                            onClick={capturePhoto}
                            className="w-16 h-16 rounded-full bg-[#00B140] hover:bg-[#007A33] flex items-center justify-center transition-all shadow-lg"
                            style={{ animation: "camPulse 2s ease-in-out infinite" }}
                            title="Tirar foto"
                          >
                            <div className="w-12 h-12 rounded-full border-4 border-white/80 flex items-center justify-center">
                              <ZapIcon className="w-5 h-5 text-white" />
                            </div>
                          </button>

                          {/* Close */}
                          <button
                            onClick={stopCamera}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            title="Fechar câmera"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── IMAGE PREVIEW WITH SCAN ANIMATION ── */}
                    {!cameraMode && imagePreview && (
                      <div className="space-y-3">
                        <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className={`w-full max-h-72 object-contain transition-all duration-500 ${isScanning ? "brightness-75" : "brightness-100"}`}
                          />
                          {isScanning && (
                            <>
                              <div className="absolute inset-0 bg-black/30" />
                              <div className="absolute left-0 right-0 h-[3px] bg-[#00B140] z-20"
                                style={{ animation: "scanBeam 1.3s linear infinite", boxShadow: "0 0 10px 3px #00B14099, 0 0 24px 8px #00B14033" }} />
                              <div className="absolute left-0 right-0 h-16 z-10"
                                style={{ animation: "scanGlow 1.3s linear infinite", background: "linear-gradient(to bottom, transparent, rgba(0,177,64,0.18), transparent)" }} />
                              <div className="absolute top-3 left-3 w-7 h-7 border-t-[3px] border-l-[3px] border-[#00B140] rounded-tl z-30"
                                style={{ animation: "cornerPulse 1.3s ease-in-out infinite" }} />
                              <div className="absolute top-3 right-3 w-7 h-7 border-t-[3px] border-r-[3px] border-[#00B140] rounded-tr z-30"
                                style={{ animation: "cornerPulse 1.3s ease-in-out infinite 0.1s" }} />
                              <div className="absolute bottom-3 left-3 w-7 h-7 border-b-[3px] border-l-[3px] border-[#00B140] rounded-bl z-30"
                                style={{ animation: "cornerPulse 1.3s ease-in-out infinite 0.2s" }} />
                              <div className="absolute bottom-3 right-3 w-7 h-7 border-b-[3px] border-r-[3px] border-[#00B140] rounded-br z-30"
                                style={{ animation: "cornerPulse 1.3s ease-in-out infinite 0.3s" }} />
                              <div className="absolute bottom-0 left-0 right-0 z-30 flex justify-center pb-4">
                                <span className="text-[10px] font-black text-[#00B140] tracking-[0.25em] uppercase px-3 py-1 rounded bg-black/60"
                                  style={{ animation: "scanLabel 1.3s ease-in-out infinite" }}>
                                  Escaneando...
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {!isScanning && (
                          <Button variant="outline" size="sm" onClick={() => { setImageBase64(null); setImagePreview(null); }}>
                            Remover imagem
                          </Button>
                        )}
                      </div>
                    )}

                    {/* ── UPLOAD ZONE (no image, no camera) ── */}
                    {!cameraMode && !imagePreview && (
                      <div className="flex-1 flex flex-col gap-3">
                        {/* Camera button — prominent */}
                        <button
                          onClick={() => startCamera("environment")}
                          className="flex-1 w-full border-2 border-dashed border-[#00B140]/40 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-[#00B140] hover:bg-green-50 transition-colors cursor-pointer min-h-40 group"
                        >
                          <div className="w-14 h-14 rounded-full bg-[#00B140]/10 group-hover:bg-[#00B140]/20 flex items-center justify-center transition-colors">
                            <Camera className="w-7 h-7 text-[#00B140]" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-[#007A33]">Tirar Foto da Máquina</p>
                            <p className="text-xs text-gray-400 mt-0.5">Abre a câmera para captura ao vivo</p>
                          </div>
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 font-medium">ou</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Gallery button */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border border-gray-200 rounded-lg flex items-center justify-center gap-2.5 py-3 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <Upload className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          <span className="text-sm text-gray-500 group-hover:text-gray-700 font-medium">Escolher da galeria</span>
                          <span className="text-xs text-gray-300">JPEG, PNG ou WebP</span>
                        </button>

                        {cameraError && (
                          <p className="text-xs text-amber-600 text-center">{cameraError}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "text" && (
                  <div className="flex flex-col flex-1 gap-2">
                    <Textarea
                      value={textDescription}
                      onChange={(e) => setTextDescription(e.target.value)}
                      placeholder="Descreva a máquina com o máximo de detalhes possível. Ex: Motor elétrico trifásico antigo, cor cinza, aproximadamente 75cv, placa indica 380V, usado em bomba de recirculação de água, funciona 16 horas por dia..."
                      className="text-sm w-full resize-none flex-1"
                      style={{ minHeight: "260px" }}
                    />
                    <p className="text-xs text-gray-400">Quanto mais detalhes, mais preciso será o diagnóstico</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {isLoading && allDisplayedSteps.length > 0 && (
            <div className="border border-green-200 rounded-lg p-4 space-y-2 bg-green-50">
              <p className="text-xs font-semibold text-[#007A33] uppercase tracking-wide mb-3">Processando diagnóstico...</p>
              {allDisplayedSteps.map((msg, i) => {
                const isDone = i < allDisplayedSteps.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00B140] shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-[#00B140] animate-spin shrink-0" />
                    )}
                    <span className={isDone ? "text-gray-400 line-through" : "font-medium text-[#333333]"}>{msg}</span>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || cameraMode}
            className="w-full h-12 bg-[#00B140] hover:bg-[#007A33] text-white font-semibold text-base"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analisando com IA...</>
            ) : (
              <><Cpu className="w-5 h-5 mr-2" />Analisar com Inteligência Artificial</>
            )}
          </Button>
        </div>

        {/* RIGHT — Dados do equipamento */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm text-[#333333] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00B140]" />
              Dados do Equipamento (Opcional)
            </CardTitle>
            <p className="text-xs text-gray-500">Preencha o que souber — a IA usará essas informações para refinar a análise</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "type", label: "Tipo de Equipamento", placeholder: "Ex: Motor Elétrico" },
                { key: "brand", label: "Marca", placeholder: "Ex: WEG, Siemens" },
                { key: "model", label: "Modelo", placeholder: "Ex: W22 75cv" },
                { key: "yearManufactured", label: "Ano de Fabricação", placeholder: "Ex: 2005" },
                { key: "voltage", label: "Tensão", placeholder: "Ex: 380V" },
                { key: "current", label: "Corrente", placeholder: "Ex: 118A" },
                { key: "power", label: "Potência", placeholder: "Ex: 75cv / 55kW" },
                { key: "hoursPerDay", label: "Horas de Uso/Dia", placeholder: "Ex: 16" },
                { key: "daysPerWeek", label: "Dias/Semana", placeholder: "Ex: 5" },
                { key: "maxConsumptionKwh", label: "Consumo Máx. (kWh)", placeholder: "Ex: 12500" },
                { key: "sector", label: "Setor", placeholder: "Ex: Produção" },
                { key: "location", label: "Localização", placeholder: "Ex: Galpão A" },
                { key: "color", label: "Cor", placeholder: "Ex: Cinza" },
                { key: "size", label: "Tamanho/Porte", placeholder: "Ex: Grande" },
                { key: "apparentCondition", label: "Condição Aparente", placeholder: "Ex: Regular" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-gray-600">{label}</Label>
                  <Input
                    value={(equipmentData as Record<string, string>)[key]}
                    onChange={(e) => setEquipmentData(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="text-sm h-8"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1">
              <Label className="text-xs text-gray-600">Observações do Operador</Label>
              <Textarea
                value={equipmentData.operatorNotes}
                onChange={(e) => setEquipmentData(prev => ({ ...prev, operatorNotes: e.target.value }))}
                placeholder="Problemas observados, comportamento incomum, histórico de manutenção..."
                className="text-sm min-h-16"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {[
                { key: "noiseObserved", label: "Ruído Anormal" },
                { key: "heatingObserved", label: "Aquecimento Excessivo" },
                { key: "vibrationObserved", label: "Vibração Excessiva" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={(equipmentData as Record<string, boolean>)[key]}
                    onCheckedChange={(checked) => setEquipmentData(prev => ({ ...prev, [key]: !!checked }))}
                  />
                  <Label htmlFor={key} className="text-sm text-gray-700 cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
