import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import TraversePage from "@/pages/TraversePage";
import JoinPage from "@/pages/JoinPage";
import ConversionsPage from "@/pages/ConversionsPage";
import RadiationPage from "@/pages/RadiationPage";

type Tab = "traverse" | "join" | "conversions" | "radiation";

function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
      <div className="flex max-w-lg mx-auto">
        <button
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${active === "traverse" ? "text-primary" : "text-muted-foreground"}`}
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
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${active === "join" ? "text-primary" : "text-muted-foreground"}`}
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
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${active === "conversions" ? "text-primary" : "text-muted-foreground"}`}
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
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${active === "radiation" ? "text-primary" : "text-muted-foreground"}`}
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
      </div>
    </nav>
  );
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("traverse");

  return (
    <>
      {/* Shared header across both tools */}
      <header className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="TraverseCalc logo" className="shrink-0">
          <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
          <polyline points="6,22 13,10 20,16 26,8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="6" cy="22" r="2" fill="white" />
          <circle cx="26" cy="8" r="2" fill="white" />
        </svg>
        <div>
          <div className="text-base font-bold leading-tight text-foreground">Survey COGO</div>
          <div className="text-xs text-muted-foreground">
            {tab === "traverse" ? "Misclose & Precision" : tab === "join" ? "Join Calculator" : tab === "conversions" ? "Unit Conversions" : "Radiation"}
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="pb-20">
        {tab === "traverse" ? <TraversePage hideHeader /> : tab === "join" ? <JoinPage /> : tab === "conversions" ? <ConversionsPage /> : <RadiationPage />}
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
