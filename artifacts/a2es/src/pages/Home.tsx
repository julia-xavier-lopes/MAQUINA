import { Link } from "wouter";
import { ArrowRight, Cpu, FileText, BarChart2, MessageSquare, CheckCircle, Factory, ArrowUpRight } from "lucide-react";
import heroBg from "../assets/hero-bg.jpg";

const stats = [
  { value: "até 40%", label: "Redução no Consumo Elétrico", color: "text-[#00B140]" },
  { value: "até 35%", label: "Redução de Emissões CO₂", color: "text-emerald-400" },
  { value: "18–36 m", label: "Payback Médio do Retrofit", color: "text-green-300" },
  { value: "100%", label: "Compatível com BNDES", color: "text-teal-400" },
];

const solutions = [
  {
    icon: Cpu,
    title: "Diagnóstico com IA",
    description: "Envie uma foto ou descreva a máquina. A IA identifica o equipamento, estima consumo, CO₂ e detecta ineficiências automaticamente.",
    href: "/scan",
    cta: "Iniciar diagnóstico",
    accent: "border-t-[#00B140]",
  },
  {
    icon: BarChart2,
    title: "Dashboard ESG",
    description: "Visualize o inventário de ativos com indicadores de eficiência, histórico de emissões e prioridades de modernização em tempo real.",
    href: "/dashboard",
    cta: "Ver dashboard",
    accent: "border-t-emerald-500",
  },
  {
    icon: FileText,
    title: "Relatório BNDES",
    description: "Gere automaticamente relatórios técnicos e ESG formatados para submissão a linhas de crédito sustentável do BNDES e bancos de fomento.",
    href: "/equipment",
    cta: "Ver exemplo",
    accent: "border-t-green-600",
  },
  {
    icon: MessageSquare,
    title: "Especialista 24h",
    description: "Converse em tempo real com nossa IA especialista em eficiência energética industrial, retrofit e regulamentações ESG brasileiras.",
    href: "/chat",
    cta: "Iniciar consulta",
    accent: "border-t-teal-500",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre o equipamento",
    description: "Envie uma foto da placa de identificação ou descreva a máquina com dados de operação.",
    icon: Factory,
  },
  {
    number: "02",
    title: "Diagnóstico por IA",
    description: "Em segundos, a IA estima consumo energético, pegada de carbono e potencial de economia.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Priorize o retrofit",
    description: "O dashboard ESG organiza automaticamente os ativos por urgência, ROI e impacto ambiental.",
    icon: BarChart2,
  },
  {
    number: "04",
    title: "Obtenha financiamento",
    description: "Gere relatórios técnicos prontos para submissão ao BNDES Eficiência e crédito sustentável.",
    icon: FileText,
  },
];

const benefits = [
  "Análise de motores, compressores, chillers, esteiras e mais de 50 tipos de equipamentos industriais",
  "Conformidade com taxonomia ESG brasileira e métricas de relatório GRI",
  "Integração com PROCEL, ABNT NBR e requisitos de certificação ISO 50001",
  "Estimativas de ROI e payback baseadas em tarifas energéticas regionais",
  "Histórico de emissões e metas de redução com acompanhamento mensal",
  "Relatórios prontos para auditoria, investidores e órgãos regulatórios",
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          minHeight: "420px",
        }}
      >
        {/* Vinheta radial suave — apenas para legibilidade do texto */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.02) 100%)",
        }} />
        {/* Gradiente bordas superior e inferior bem suave */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col items-center text-center py-16 justify-center" style={{ minHeight: "420px" }}>

            {/* Linha verde acima do título */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-[#7EE89A]/70" />
              <div className="inline-flex items-center gap-2 bg-black/30 border border-white/15 text-green-300 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#00B140] animate-pulse" />
                Plataforma de Eficiência Industrial com IA
              </div>
              <div className="h-px w-10 bg-[#7EE89A]/70" />
            </div>

            {/* Bloco de texto com backdrop branco */}
            <div className="relative px-8 py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)", boxShadow: "0 8px 40px rgba(0,0,0,0.35)" }}>
              <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-5" style={{ color: "#1a1a1a" }}>
                Transforme suas<br />
                <span style={{ color: "#00B140" }}>Máquinas Legadas</span><br />
                em Ativos Inteligentes
              </h1>
              <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: "#2a2a2a" }}>
                MaquinAI diagnostica ineficiências industriais com IA, gera planos de retrofit e relatórios prontos para financiamento BNDES — tudo em minutos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link href="/scan" className="no-underline">
                <button className="flex items-center gap-2 bg-[#00B140] hover:bg-[#007A33] text-white font-bold px-8 py-4 text-sm transition-all shadow-lg shadow-black/40 rounded-md">
                  Analisar Equipamento
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/dashboard" className="no-underline">
                <button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-[#007A33] font-bold px-8 py-4 text-sm transition-all shadow-lg shadow-black/30 rounded-md">
                  Ver Dashboard ESG
                </button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 mt-10 pt-6 border-t border-white/15 w-full justify-center">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#7EE89A]" />
                <span className="text-xs text-white/70 font-medium">Sem cadastro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#7EE89A]" />
                <span className="text-xs text-white/70 font-medium">BNDES compatível</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#7EE89A]" />
                <span className="text-xs text-white/70 font-medium">ISO 50001</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#007A33] py-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map(({ value, label }, i) => (
              <div
                key={label}
                className={`text-center py-10 px-6 relative ${i < 3 ? "border-r border-white/20" : ""}`}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white/40" />
                <p className="text-3xl font-black text-white mb-1">{value}</p>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTIONS ── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-[#00B140] text-xs font-bold uppercase tracking-widest mb-2">Soluções</p>
            <h2 className="text-3xl font-black text-[#1A1A1A] leading-tight">
              Uma plataforma completa para<br className="hidden md:block" />eficiência industrial
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {solutions.map(({ icon: Icon, title, description, href, cta, accent }) => (
              <Link key={title} href={href} className="no-underline group">
                <div className={`h-full flex flex-col p-7 border-2 border-gray-100 border-t-4 ${accent} hover:border-gray-200 hover:shadow-lg transition-all bg-white rounded-sm`}>
                  <div className="w-11 h-11 bg-[#00B140] group-hover:bg-[#007A33] flex items-center justify-center mb-5 transition-colors rounded-md">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-[#1A1A1A] text-base mb-3">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{description}</p>
                  <span className="flex items-center gap-1.5 text-[#00B140] text-sm font-bold group-hover:gap-3 transition-all">
                    {cta} <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#F8F8F8] py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-[#00B140] text-xs font-bold uppercase tracking-widest mb-2">Como funciona</p>
            <h2 className="text-3xl font-black text-[#1A1A1A]">Do diagnóstico ao financiamento em 4 etapas</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 relative">
            {/* Connector line desktop */}
            <div className="hidden lg:block absolute top-7 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-px bg-[#00B140]/20 z-0" />
            {steps.map(({ number, title, description, icon: Icon }, idx) => (
              <div key={number} className="relative z-10 flex flex-col items-start px-6 pb-8 lg:pb-0">
                {/* Number circle */}
                <div className="w-14 h-14 rounded-full bg-[#005B2A] flex items-center justify-center mb-5 shadow-lg shadow-green-900/20 shrink-0">
                  <span className="text-lg font-black text-white">{number}</span>
                </div>
                {idx < 3 && (
                  <div className="lg:hidden w-px h-8 bg-[#00B140]/30 ml-7 mb-0 -mt-2 mb-3" />
                )}
                <Icon className="w-4 h-4 text-[#00B140] mb-2" />
                <h3 className="font-bold text-[#1A1A1A] text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Link href="/scan" className="no-underline">
              <button className="flex items-center gap-2 bg-[#00B140] hover:bg-[#007A33] text-white font-bold px-8 py-3.5 text-sm transition-all rounded-sm shadow-lg shadow-green-200">
                Começar análise agora <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#00B140] text-xs font-bold uppercase tracking-widest mb-2">Por que MaquinAI</p>
              <h2 className="text-3xl font-black text-[#1A1A1A] leading-tight mb-6">
                Construído para a realidade<br />industrial brasileira
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                MaquinAI combina visão computacional de última geração com conhecimento profundo de eficiência energética industrial e regulamentações brasileiras para entregar diagnósticos precisos e acionáveis.
              </p>
              <div className="flex gap-3">
                <Link href="/scan" className="no-underline">
                  <button className="flex items-center gap-2 bg-[#00B140] hover:bg-[#007A33] text-white font-bold px-7 py-3.5 text-sm transition-all rounded-sm">
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/chat" className="no-underline">
                  <button className="flex items-center gap-2 border-2 border-gray-200 hover:border-[#00B140] text-gray-600 hover:text-[#007A33] font-semibold px-7 py-3.5 text-sm transition-all rounded-sm">
                    Consultar IA
                  </button>
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {benefits.map((benefit, i) => (
                <div key={benefit} className="flex items-start gap-3 p-4 rounded-lg hover:bg-green-50 transition-colors border border-transparent hover:border-green-100 group">
                  <div className="w-5 h-5 rounded-full bg-[#00B140]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#00B140] transition-colors">
                    <CheckCircle className="w-3 h-3 text-[#00B140] group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-sm text-[#333333] leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative bg-[#005B2A] py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00B140]/20 rounded-full translate-x-48 -translate-y-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#00B140]/15 rounded-full -translate-x-36 translate-y-36 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-green-300 text-xs font-bold uppercase tracking-widest mb-3">Comece hoje</p>
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
            Pronto para reduzir custos<br className="hidden md:block" />e emissões de CO₂?
          </h2>
          <p className="text-green-200 text-sm mb-10 max-w-md mx-auto">Analise seu primeiro equipamento agora. Sem cadastro. Relatório gerado em segundos.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/scan" className="no-underline">
              <button className="flex items-center justify-center gap-2 bg-white text-[#007A33] hover:bg-gray-100 font-black px-9 py-4 text-sm transition-all rounded-sm shadow-xl">
                Analisar Equipamento <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/chat" className="no-underline">
              <button className="flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/5 font-semibold px-9 py-4 text-sm transition-all rounded-sm">
                Falar com Especialista IA
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#111111] py-14">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  <div className="w-2 h-6 bg-[#00B140]" />
                  <div className="w-2 h-6 bg-[#007A33]" />
                </div>
                <span className="text-white font-black text-lg">MaquinAI</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                IA para Energia e Sustentabilidade — Plataforma de eficiência energética para a indústria brasileira.
              </p>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 w-fit">
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="28" height="28" fill="#3DCD58"/>
                  <text x="14" y="20" fontSize="13" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">SE</text>
                </svg>
                <span className="text-[9px] text-gray-400 font-semibold">Solução para <span className="text-white">Schneider Electric</span></span>
              </div>
            </div>
            {[
              {
                label: "Plataforma",
                links: ["Diagnóstico IA", "Acervo", "Dashboard ESG", "Consultor IA"],
                hrefs: ["/scan", "/equipment", "/dashboard", "/chat"],
              },
              {
                label: "Soluções",
                links: ["Eficiência Energética", "Gestão de CO₂", "Relatório ESG", "Financiamento BNDES"],
                hrefs: ["/scan", "/dashboard", "/equipment", "/equipment"],
              },
              {
                label: "Indústrias",
                links: ["Manufatura", "Mineração", "Agronegócio", "Construção Civil"],
                hrefs: ["/", "/", "/", "/"],
              },
            ].map(({ label, links, hrefs }) => (
              <div key={label}>
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">{label}</p>
                <ul className="space-y-2.5">
                  {links.map((link, i) => (
                    <li key={link}>
                      <Link href={hrefs[i]} className="text-gray-500 hover:text-[#00B140] text-xs transition-colors no-underline">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-gray-600 text-xs">© 2026 MaquinAI — IA para Energia e Sustentabilidade. Todos os direitos reservados.</p>
            <p className="text-gray-700 text-xs">Desenvolvido para PMEs industriais brasileiras</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
