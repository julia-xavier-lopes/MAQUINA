import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Activity, BarChart2, Cpu, Factory } from "lucide-react";
import seLogo from "../../assets/schneider-electric.png";

const navLinks = [
  { href: "/scan",      label: "Diagnóstico IA", icon: Cpu },
  { href: "/equipment", label: "Acervo",          icon: Factory },
  { href: "/emissions", label: "Monitoramento",   icon: Activity },
  { href: "/dashboard", label: "Dashboard ESG",   icon: BarChart2 },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center h-14 gap-8">

          {/* Logo MaquinAI */}
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0 group">
            <div className="relative w-8 h-8 flex items-center justify-center bg-[#00B140] rounded-lg shadow-sm group-hover:bg-[#007A33] transition-colors">
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-sm" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                </div>
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[16px] font-black text-[#1A1A1A] tracking-tight">MaquinAI</span>
              <span className="text-[8px] text-[#007A33] font-bold tracking-widest uppercase">IA · Energia · Sustentabilidade</span>
            </div>
          </Link>

          {/* Nav Links — desktop */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm rounded-md transition-all no-underline whitespace-nowrap ${
                  isActive(href)
                    ? "text-[#00B140] font-bold border-b-2 border-[#007A33] bg-transparent rounded-none"
                    : "font-medium text-[#1A1A1A] hover:text-[#00B140] hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Schneider Electric logo — direita */}
          <div className="hidden md:flex items-center ml-auto shrink-0">
            <div className="w-px h-8 bg-gray-200 mr-6" />
            <div className="flex flex-col items-start">
              <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Solução para</span>
              <div style={{ width: "210px", height: "44px", overflow: "hidden", position: "relative" }}>
                <img
                  src={seLogo}
                  alt="Schneider Electric"
                  style={{
                    position: "absolute",
                    width: "260%",
                    height: "auto",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    mixBlendMode: "multiply",
                  }}
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center shrink-0">
            <Link href="/scan" className="no-underline">
              <button className="bg-[#00B140] hover:bg-[#007A33] text-white text-sm font-bold px-5 py-2 rounded-md transition-colors">
                Analisar Máquina
              </button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden ml-auto p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg no-underline ${
                  isActive(href)
                    ? "bg-green-50 text-[#00B140]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
            <img src={seLogo} alt="Schneider Electric" className="h-5 w-auto opacity-70" />
            <Link href="/scan" onClick={() => setMobileOpen(false)}>
              <button className="bg-[#00B140] text-white text-sm font-bold px-4 py-2 rounded-md">
                Analisar Máquina
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
