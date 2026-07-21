import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import TraversePage from "@/pages/TraversePage";
import JoinPage from "@/pages/JoinPage";
import ConversionsPage from "@/pages/ConversionsPage";
import RadiationPage from "@/pages/RadiationPage";
import CompiledSurveyPage from "@/pages/CompiledSurveyPage";

type Tab = "traverse" | "join" | "conversions" | "radiation" | "compiled";

function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const navStyle = { background: "#2D3580", borderTop: "1px solid rgba(255,255,255,0.12)" };
  const activeStyle = { color: "#3A7EC4" };
  const inactiveStyle = { color: "rgba(255,255,255,0.55)" };
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom" style={navStyle}>
      <div className="flex max-w-lg mx-auto">
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors"
          style={active === "traverse" ? activeStyle : inactiveStyle}
          onClick={() => onChange("traverse")}
          data-testid="nav-traverse"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <polyline points="3,17 8,7 14,11 19,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="3" cy="17" r="2" fill="currentColor" />
            <circle cx="19" cy="5" r="2" fill="currentColor" />
          </svg>
          Traverse
        </button>
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors"
          style={active === "join" ? activeStyle : inactiveStyle}
          onClick={() => onChange("join")}
          data-testid="nav-join"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <circle cx="18" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <line x1="6.5" y1="11" x2="15.5" y2="11" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 1.5" />
            <path d="M11 7.5 L11 9" stroke="currentColor" strokeWidth="1.5" />
            <text x="11" y="6.5" textAnchor="middle" fontSize="5.5" fill="currentColor" fontWeight="700">°</text>
          </svg>
          Join
        </button>
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors"
          style={active === "conversions" ? activeStyle : inactiveStyle}
          onClick={() => onChange("conversions")}
          data-testid="nav-conversions"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M2 11 L7 7 M2 11 L7 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 11 L15 7 M20 11 L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="7" y1="9" x2="7" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="15" y1="9" x2="15" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Convert
        </button>
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors"
          style={active === "radiation" ? activeStyle : inactiveStyle}
          onClick={() => onChange("radiation")}
          data-testid="nav-radiation"
        >
          {/* Radiation icon: centre dot with lines radiating out */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="2.5" fill="currentColor" />
            <line x1="11" y1="8" x2="11" y2="3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="13.6" y1="8.4" x2="17.2" y2="4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="14.5" y1="11" x2="19.5" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="13.6" y1="13.6" x2="17.2" y2="17.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="11" y1="14" x2="11" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="8.4" y1="13.6" x2="4.8" y2="17.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="7.5" y1="11" x2="2.5" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="8.4" y1="8.4" x2="4.8" y2="4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Radiation
        </button>
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors"
          style={active === "compiled" ? activeStyle : inactiveStyle}
          onClick={() => onChange("compiled")}
          data-testid="nav-compiled"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {/* Document with checkmark */}
            <rect x="3" y="2" width="13" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" fill="none"/>
            <line x1="6" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="6" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="6" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="17" cy="16" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.4"/>
            <polyline points="15,16 16.5,17.5 19,14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          Compiled
        </button>
      </div>
    </nav>
  );
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("traverse");

  return (
    <>
      {/* Treasco branded header */}
      <header className="sticky top-0 z-20 border-b border-border" style={{ background: "#2D3580" }}>
        {/* Logo bar */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <img
            src="./treasco-logo.jpg"
            alt="Treasco Surveyors"
            className="h-8 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#3A7EC4", letterSpacing: "0.12em" }}
          >
            Survey COGO
          </span>
        </div>
        {/* Active tab label */}
        <div className="px-4 pb-2">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            {tab === "traverse" ? "Misclose & Precision" : tab === "join" ? "Join Calculator" : tab === "conversions" ? "Unit Conversions" : tab === "radiation" ? "Radiation" : "Compiled Survey"}
          </span>
        </div>
      </header>

      {/* Page content */}
      <div className="pb-20">
        {tab === "traverse" ? <TraversePage hideHeader /> : tab === "join" ? <JoinPage /> : tab === "conversions" ? <ConversionsPage /> : tab === "radiation" ? <RadiationPage /> : <CompiledSurveyPage />}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster />
    </QueryClientProvider>
  );
}
