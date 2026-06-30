import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, Ruler, SquareStack } from "lucide-react";

// ─── Conversion constants ────────────────────────────────────────────────────
const LINK_TO_METRE     = 0.201168;          // 1 Gunter's link = 0.201168 m
const FOOT_TO_METRE     = 0.3048;            // 1 international foot = 0.3048 m
const CHAIN_TO_METRE    = 20.1168;           // 1 chain = 100 links = 20.1168 m
const MILE_TO_METRE     = 1609.344;
const YARD_TO_METRE     = 0.9144;
const INCH_TO_METRE     = 0.0254;

const HA_TO_M2          = 10000;
const ACRE_TO_M2        = 4046.8564224;      // 1 acre = 4046.8564224 m²
const ROOD_TO_M2        = ACRE_TO_M2 / 4;   // 4 roods = 1 acre
const PERCH_TO_M2       = ACRE_TO_M2 / 160; // 160 perches = 1 acre
const SQ_FOOT_TO_M2     = FOOT_TO_METRE ** 2;
const SQ_CHAIN_TO_M2    = CHAIN_TO_METRE ** 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number, dp = 6): string {
  if (!isFinite(v)) return "";
  // trim trailing zeros but keep at least 3 dp
  const s = v.toFixed(dp);
  return parseFloat(s).toString();
}

function fmtFixed(v: number, dp: number): string {
  if (!isFinite(v)) return "";
  return v.toFixed(dp);
}

// Break a decimal area (m²) into integer acres, roods, perches + remainder m²
function toArp(m2: number): { acres: number; roods: number; perches: number; m2: number } {
  const totalPerches = m2 / PERCH_TO_M2;
  const acres   = Math.floor(totalPerches / 160);
  const roods   = Math.floor((totalPerches - acres * 160) / 40);
  const perches = Math.floor(totalPerches - acres * 160 - roods * 40);
  const rem     = m2 - (acres * 160 + roods * 40 + perches) * PERCH_TO_M2;
  return { acres, roods, perches, m2: rem };
}

// ─── Reusable result row ──────────────────────────────────────────────────────
function ResultRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="font-mono font-bold text-foreground text-sm text-right">
        {value} <span className="font-normal text-muted-foreground text-xs">{unit}</span>
      </span>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
  );
}

// ─── INPUT FIELD ─────────────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        className="h-11 font-bold text-base text-foreground"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// LENGTH CONVERTER — Links ↔ Metres ↔ Feet (and more)
// ════════════════════════════════════════════════════════════════════════════════
function LengthConverter() {
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<"links" | "metres" | "feet" | "chains" | "yards" | "inches" | "miles">("metres");

  const val = parseFloat(input);
  const m: number = isNaN(val) ? NaN : (() => {
    switch (unit) {
      case "metres":  return val;
      case "links":   return val * LINK_TO_METRE;
      case "feet":    return val * FOOT_TO_METRE;
      case "chains":  return val * CHAIN_TO_METRE;
      case "yards":   return val * YARD_TO_METRE;
      case "inches":  return val * INCH_TO_METRE;
      case "miles":   return val * MILE_TO_METRE;
    }
  })();

  const units: { key: typeof unit; label: string }[] = [
    { key: "metres",  label: "Metres" },
    { key: "links",   label: "Links" },
    { key: "feet",    label: "Feet" },
    { key: "chains",  label: "Chains" },
    { key: "yards",   label: "Yards" },
    { key: "inches",  label: "Inches" },
    { key: "miles",   label: "Miles" },
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">
          <SectionHeading icon={Ruler} title="Length Conversions" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Unit selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            From unit
          </label>
          <div className="flex flex-wrap gap-1.5">
            {units.map((u) => (
              <button
                key={u.key}
                onClick={() => setUnit(u.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  unit === u.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <NumInput label={`Value (${unit})`} value={input} onChange={setInput} placeholder="Enter value" />

        {/* Results */}
        {isFinite(m) && input !== "" && (
          <div className="bg-muted/40 rounded-xl px-3 py-2 mt-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowLeftRight size={11} /> Results
            </div>
            {unit !== "metres"  && <ResultRow label="Metres"  value={fmtFixed(m, 6)} unit="m"  />}
            {unit !== "links"   && <ResultRow label="Links"   value={fmtFixed(m / LINK_TO_METRE, 6)}  unit="lk" />}
            {unit !== "feet"    && <ResultRow label="Feet"    value={fmtFixed(m / FOOT_TO_METRE, 6)}  unit="ft" />}
            {unit !== "chains"  && <ResultRow label="Chains"  value={fmtFixed(m / CHAIN_TO_METRE, 6)} unit="ch" />}
            {unit !== "yards"   && <ResultRow label="Yards"   value={fmtFixed(m / YARD_TO_METRE, 6)}  unit="yd" />}
            {unit !== "inches"  && <ResultRow label="Inches"  value={fmtFixed(m / INCH_TO_METRE, 4)}  unit="in" />}
            {unit !== "miles"   && <ResultRow label="Miles"   value={fmtFixed(m / MILE_TO_METRE, 8)}  unit="mi" />}
          </div>
        )}

        {/* Quick ref */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Quick reference</p>
          <p>1 chain = 100 links = 20.1168 m = 66 ft</p>
          <p>1 link = 0.201168 m = 7.92 in</p>
          <p>1 foot = 0.3048 m exactly</p>
          <p>1 mile = 80 chains = 1,609.344 m</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// AREA CONVERTER — ha ↔ m² ↔ acres ↔ A-R-P ↔ sq ft ↔ sq chains
// ════════════════════════════════════════════════════════════════════════════════
function AreaConverter() {
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<"ha" | "m2" | "acres" | "sqft" | "sqchains">("ha");

  // ARP inputs (alternative entry)
  const [arpA, setArpA] = useState("");
  const [arpR, setArpR] = useState("");
  const [arpP, setArpP] = useState("");
  const [arpMode, setArpMode] = useState(false);

  const val = parseFloat(input);

  const m2: number = arpMode
    ? (() => {
        const a = parseFloat(arpA) || 0;
        const r = parseFloat(arpR) || 0;
        const p = parseFloat(arpP) || 0;
        return (a * 160 + r * 40 + p) * PERCH_TO_M2;
      })()
    : isNaN(val) ? NaN : (() => {
        switch (unit) {
          case "ha":       return val * HA_TO_M2;
          case "m2":       return val;
          case "acres":    return val * ACRE_TO_M2;
          case "sqft":     return val * SQ_FOOT_TO_M2;
          case "sqchains": return val * SQ_CHAIN_TO_M2;
        }
      })();

  const hasInput = arpMode
    ? (arpA !== "" || arpR !== "" || arpP !== "")
    : (input !== "" && isFinite(m2));

  const areaUnits: { key: typeof unit; label: string }[] = [
    { key: "ha",       label: "Hectares" },
    { key: "m2",       label: "m²" },
    { key: "acres",    label: "Acres" },
    { key: "sqft",     label: "Sq Feet" },
    { key: "sqchains", label: "Sq Chains" },
  ];

  const arp = toArp(m2);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">
          <SectionHeading icon={SquareStack} title="Area Conversions" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setArpMode(false)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${!arpMode ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
          >
            Decimal Input
          </button>
          <button
            onClick={() => setArpMode(true)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${arpMode ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
          >
            A – R – P Input
          </button>
        </div>

        {!arpMode ? (
          <>
            {/* Unit selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">From unit</label>
              <div className="flex flex-wrap gap-1.5">
                {areaUnits.map((u) => (
                  <button
                    key={u.key}
                    onClick={() => setUnit(u.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      unit === u.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <NumInput
              label={unit === "m2" ? "Value (m²)" : `Value (${unit})`}
              value={input}
              onChange={setInput}
              placeholder="Enter value"
            />
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="Acres" value={arpA} onChange={setArpA} placeholder="0" />
            <NumInput label="Roods" value={arpR} onChange={setArpR} placeholder="0" />
            <NumInput label="Perches" value={arpP} onChange={setArpP} placeholder="0" />
          </div>
        )}

        {/* Results */}
        {hasInput && isFinite(m2) && (
          <div className="bg-muted/40 rounded-xl px-3 py-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowLeftRight size={11} /> Results
            </div>
            {/* ARP breakdown — always show first and prominently */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-2">
              <div className="text-xs font-semibold text-primary mb-1">Acres – Roods – Perches</div>
              <div className="font-mono font-bold text-foreground text-base">
                {arp.acres}a {arp.roods}r {arp.perches}p
              </div>
              {arp.m2 > 0.0001 && (
                <div className="font-mono text-xs text-muted-foreground">
                  + {fmtFixed(arp.m2, 2)} m²
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-0.5">
                = {arp.acres * 160 + arp.roods * 40 + arp.perches} perches total
              </div>
            </div>

            {!(arpMode && unit === "ha") && <ResultRow label="Hectares"  value={fmtFixed(m2 / HA_TO_M2, 6)}    unit="ha" />}
            <ResultRow label="m²"        value={fmtFixed(m2, 4)}                            unit="m²" />
            {!(arpMode && unit === "acres") && <ResultRow label="Acres"  value={fmtFixed(m2 / ACRE_TO_M2, 6)}  unit="ac" />}
            <ResultRow label="Roods"     value={fmtFixed(m2 / ROOD_TO_M2, 6)}               unit="ro" />
            <ResultRow label="Perches"   value={fmtFixed(m2 / PERCH_TO_M2, 4)}              unit="p"  />
            <ResultRow label="Sq Chains" value={fmtFixed(m2 / SQ_CHAIN_TO_M2, 6)}           unit="ch²" />
            <ResultRow label="Sq Feet"   value={fmtFixed(m2 / SQ_FOOT_TO_M2, 2)}            unit="ft²" />
          </div>
        )}

        {/* Quick ref */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Quick reference</p>
          <p>1 acre = 4 roods = 160 perches = 10 sq chains</p>
          <p>1 rood = 40 perches = 1,011.71 m²</p>
          <p>1 perch = 25.2929 m²</p>
          <p>1 ha = 2.47105 acres</p>
          <p>1 acre = 0.404686 ha = 4,046.86 m²</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function ConversionsPage() {
  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
      <LengthConverter />
      <AreaConverter />
    </div>
  );
}
