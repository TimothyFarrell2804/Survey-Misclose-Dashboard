import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, MapPin, Navigation } from "lucide-react";
import { toRad, toDeg } from "@/lib/traverse";
import { ddToDMS, fmtDist } from "@/lib/join";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RadiationShot {
  id: number;
  label: string;
  bearingDeg: string;
  bearingMin: string;
  bearingSec: string;
  distance: string;
}

interface ComputedShot {
  id: number;
  label: string;
  bearingDD: number;
  bearingStr: string;
  distance: number;
  easting: number;
  northing: number;
  deltaE: number;
  deltaN: number;
}

// ─── Bearing DMS → decimal degrees ───────────────────────────────────────────
function dmsToDD(deg: string, min: string, sec: string): number {
  const d = Math.abs(parseInt(deg) || 0);
  const m = parseInt(min) || 0;
  const s = parseInt(sec) || 0;
  return d + m / 60 + s / 3600;
}

// ─── Compute radiated coordinate ─────────────────────────────────────────────
function radiate(
  fromE: number, fromN: number,
  bearingDD: number, distance: number
): { e: number; n: number } {
  const rad = toRad(bearingDD);
  return {
    e: fromE + distance * Math.sin(rad),
    n: fromN + distance * Math.cos(rad),
  };
}

// ─── Reusable input ───────────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, placeholder, inputMode = "decimal", onNext,
  inputRef,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: "decimal" | "numeric";
  onNext?: () => void; inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-0.5 flex-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <Input
        ref={inputRef}
        type="number"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        className="h-10 font-bold text-sm text-foreground text-center"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === "Tab") && onNext) {
            e.preventDefault(); onNext();
          }
        }}
      />
    </div>
  );
}

// ─── SVG Diagram ─────────────────────────────────────────────────────────────
const SVG_W = 360;
const SVG_H = 340;
const PAD = 52;

function RadiationDiagram({
  setupE, setupN, setupLabel, shots,
}: {
  setupE: number; setupN: number; setupLabel: string; shots: ComputedShot[];
}) {
  if (shots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
        Add radiation shots to see diagram
      </div>
    );
  }

  // All points: setup + radiated
  const allE = [setupE, ...shots.map((s) => s.easting)];
  const allN = [setupN, ...shots.map((s) => s.northing)];

  const minE = Math.min(...allE);
  const maxE = Math.max(...allE);
  const minN = Math.min(...allN);
  const maxN = Math.max(...allN);

  const rangeE = maxE - minE || 20;
  const rangeN = maxN - minN || 20;

  const usableW = SVG_W - PAD * 2;
  const usableH = SVG_H - PAD * 2;

  const scaleE = usableW / rangeE;
  const scaleN = usableH / rangeN;
  const scale = Math.min(scaleE, scaleN) * 0.85;

  const offsetX = PAD + (usableW - rangeE * scale) / 2;
  const offsetY = PAD + (usableH - rangeN * scale) / 2;

  function toSvg(e: number, n: number) {
    return {
      x: offsetX + (e - minE) * scale,
      y: SVG_H - (offsetY + (n - minN) * scale),
    };
  }

  const setupSvg = toSvg(setupE, setupN);
  const shotSvgs = shots.map((s) => toSvg(s.easting, s.northing));

  // North arrow position
  const arrowX = SVG_W - 24;
  const arrowY = 24;

  // Label nudge: push label away from centre
  function labelPos(sx: number, sy: number) {
    const dx = sx - setupSvg.x;
    const dy = sy - setupSvg.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: sx + (dx / len) * 14, y: sy + (dy / len) * 14 };
  }

  // Mid-line label for bearing/distance
  function midLabel(sx: number, sy: number) {
    return {
      x: (setupSvg.x + sx) / 2,
      y: (setupSvg.y + sy) / 2,
    };
  }

  // Perpendicular offset for mid-line text
  function perpOffset(x1: number, y1: number, x2: number, y2: number, off = 11) {
    const dx = x2 - x1; const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { px: -dy / len * off, py: dx / len * off };
  }

  const PRIMARY = "hsl(220, 70%, 38%)";
  const GOLD = "#f59e0b";
  const MUTED = "#64748b";
  const TEXT = "#1e293b";

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: "block", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}
      fontFamily="Arial, sans-serif"
    >
      {/* Grid background */}
      <defs>
        <pattern id="radgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#radgrid)" />

      {/* North arrow */}
      <line x1={arrowX} y1={arrowY + 14} x2={arrowX} y2={arrowY - 12} stroke={PRIMARY} strokeWidth="1.5" />
      <polygon
        points={`${arrowX},${arrowY - 16} ${arrowX - 5},${arrowY - 4} ${arrowX + 5},${arrowY - 4}`}
        fill={PRIMARY}
      />
      <text x={arrowX} y={arrowY + 24} textAnchor="middle" fontSize="9" fill={PRIMARY} fontWeight="700">N</text>

      {/* Radiation lines */}
      {shots.map((shot, i) => {
        const sp = shotSvgs[i];
        const mid = midLabel(sp.x, sp.y);
        const perp = perpOffset(setupSvg.x, setupSvg.y, sp.x, sp.y);
        const linelen = Math.sqrt((sp.x - setupSvg.x) ** 2 + (sp.y - setupSvg.y) ** 2);
        const tooShort = linelen < 30;
        return (
          <g key={shot.id}>
            {/* Line with arrowhead */}
            <defs>
              <marker id={`arr-${i}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill={PRIMARY} />
              </marker>
            </defs>
            <line
              x1={setupSvg.x} y1={setupSvg.y}
              x2={sp.x} y2={sp.y}
              stroke={PRIMARY} strokeWidth="1.8"
              markerEnd={`url(#arr-${i})`}
              strokeLinecap="round"
            />
            {/* Bearing label */}
            {!tooShort && (
              <text
                x={mid.x + perp.px}
                y={mid.y + perp.py - 4}
                textAnchor="middle"
                fontSize="8.5"
                fill={PRIMARY}
                fontWeight="700"
              >
                {shot.bearingStr}
              </text>
            )}
            {/* Distance label */}
            {!tooShort && (
              <text
                x={mid.x + perp.px}
                y={mid.y + perp.py + 7}
                textAnchor="middle"
                fontSize="8"
                fill={MUTED}
              >
                {fmtDist(shot.distance)}
              </text>
            )}
          </g>
        );
      })}

      {/* Radiated point circles + labels */}
      {shots.map((shot, i) => {
        const sp = shotSvgs[i];
        const lp = labelPos(sp.x, sp.y);
        return (
          <g key={`pt-${shot.id}`}>
            {/* Point dot */}
            <circle cx={sp.x} cy={sp.y} r="5" fill={GOLD} stroke="white" strokeWidth="1.5" />
            {/* Label */}
            <text x={lp.x} y={lp.y - 5} textAnchor="middle" fontSize="9" fill={TEXT} fontWeight="700">
              {shot.label || `R${i + 1}`}
            </text>
            {/* Coordinates */}
            <text x={lp.x} y={lp.y + 5} textAnchor="middle" fontSize="7.5" fill={MUTED}>
              E {shot.easting.toFixed(3)}
            </text>
            <text x={lp.x} y={lp.y + 14} textAnchor="middle" fontSize="7.5" fill={MUTED}>
              N {shot.northing.toFixed(3)}
            </text>
          </g>
        );
      })}

      {/* Setup point — drawn last so it sits on top */}
      <circle cx={setupSvg.x} cy={setupSvg.y} r="7" fill={PRIMARY} stroke="white" strokeWidth="2" />
      <text x={setupSvg.x} y={setupSvg.y - 12} textAnchor="middle" fontSize="9" fill={TEXT} fontWeight="700">
        {setupLabel || "Setup"}
      </text>
      <text x={setupSvg.x} y={setupSvg.y + 20} textAnchor="middle" fontSize="7.5" fill={MUTED}>
        E {setupE.toFixed(3)}
      </text>
      <text x={setupSvg.x} y={setupSvg.y + 30} textAnchor="middle" fontSize="7.5" fill={MUTED}>
        N {setupN.toFixed(3)}
      </text>
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
let nextId = 1;

export default function RadiationPage() {
  const { toast } = useToast();

  // Setup point
  const [setupLabel, setSetupLabel] = useState("Setup");
  const [setupE, setSetupE] = useState("");
  const [setupN, setSetupN] = useState("");
  const [setupConfirmed, setSetupConfirmed] = useState(false);

  // Radiation shots
  const [shots, setShots] = useState<RadiationShot[]>([]);

  // New shot form
  const [newLabel, setNewLabel]  = useState("");
  const [newDeg,   setNewDeg]    = useState("");
  const [newMin,   setNewMin]    = useState("");
  const [newSec,   setNewSec]    = useState("");
  const [newDist,  setNewDist]   = useState("");

  // Refs for Tab/Enter navigation in new shot form
  const minRef  = useRef<HTMLInputElement>(null);
  const secRef  = useRef<HTMLInputElement>(null);
  const distRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  // Computed results
  const setupENum = parseFloat(setupE);
  const setupNNum = parseFloat(setupN);
  const setupValid = isFinite(setupENum) && isFinite(setupNNum);

  const computed: ComputedShot[] = setupValid
    ? shots
        .map((s) => {
          const bearDD = dmsToDD(s.bearingDeg, s.bearingMin, s.bearingSec);
          const dist   = parseFloat(s.distance);
          if (!isFinite(bearDD) || !isFinite(dist) || dist <= 0) return null;
          const { e, n } = radiate(setupENum, setupNNum, bearDD, dist);
          return {
            id:         s.id,
            label:      s.label || `R${shots.indexOf(s) + 1}`,
            bearingDD:  bearDD,
            bearingStr: ddToDMS(bearDD),
            distance:   dist,
            easting:    e,
            northing:   n,
            deltaE:     e - setupENum,
            deltaN:     n - setupNNum,
          } satisfies ComputedShot;
        })
        .filter(Boolean) as ComputedShot[]
    : [];

  function confirmSetup() {
    if (!setupValid) {
      toast({ title: "Enter valid Easting and Northing", variant: "destructive" });
      return;
    }
    setSetupConfirmed(true);
  }

  function addShot() {
    const dist = parseFloat(newDist);
    if (!isFinite(dist) || dist <= 0) {
      toast({ title: "Enter a valid distance", variant: "destructive" });
      return;
    }
    const deg = parseInt(newDeg) || 0;
    const min = parseInt(newMin) || 0;
    const sec = parseInt(newSec) || 0;
    if (deg < 0 || deg > 359 || min > 59 || sec > 59) {
      toast({ title: "Check bearing values (DEG 0–359, MIN/SEC 0–59)", variant: "destructive" });
      return;
    }
    setShots((prev) => [
      ...prev,
      {
        id: nextId++,
        label: newLabel.trim(),
        bearingDeg: String(deg),
        bearingMin: String(min).padStart(2, "0"),
        bearingSec: String(sec).padStart(2, "0"),
        distance: String(dist),
      },
    ]);
    setNewLabel(""); setNewDeg(""); setNewMin(""); setNewSec(""); setNewDist("");
    setTimeout(() => labelRef.current?.focus(), 50);
  }

  function deleteShot(id: number) {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-4">

      {/* ── Setup Point ── */}
      <Card className="border-border shadow-sm">
        <CardContent className="px-4 pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin size={15} />
            </div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Setup Point</h2>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Station Label</label>
            <Input
              value={setupLabel}
              onChange={(e) => { setSetupLabel(e.target.value); setSetupConfirmed(false); }}
              placeholder="e.g. IS1, DP12345"
              className="h-10 font-bold text-sm text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Easting</label>
              <Input
                type="number" inputMode="decimal"
                value={setupE}
                onChange={(e) => { setSetupE(e.target.value); setSetupConfirmed(false); }}
                placeholder="000000.000"
                className="h-10 font-bold text-sm text-foreground"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); document.querySelector<HTMLInputElement>("[data-setup-n]")?.focus(); } }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Northing</label>
              <Input
                data-setup-n
                type="number" inputMode="decimal"
                value={setupN}
                onChange={(e) => { setSetupN(e.target.value); setSetupConfirmed(false); }}
                placeholder="0000000.000"
                className="h-10 font-bold text-sm text-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmSetup(); } }}
              />
            </div>
          </div>

          {!setupConfirmed ? (
            <Button onClick={confirmSetup} className="w-full h-10 gap-2">
              <MapPin size={15} /> Set Station
            </Button>
          ) : (
            <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-primary">
                {setupLabel} — E {parseFloat(setupE).toFixed(3)}, N {parseFloat(setupN).toFixed(3)}
              </span>
              <button
                onClick={() => setSetupConfirmed(false)}
                className="text-xs text-muted-foreground underline ml-2"
              >Edit</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Radiation Shot ── */}
      {setupConfirmed && (
        <Card className="border-border shadow-sm">
          <CardContent className="px-4 pt-4 pb-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Navigation size={15} />
              </div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Add Radiation Shot</h2>
            </div>

            {/* Label */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Point Label (optional)</label>
              <Input
                ref={labelRef}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); document.querySelector<HTMLInputElement>("[data-new-deg]")?.focus(); } }}
                placeholder="e.g. Peg A, DP99999"
                className="h-10 text-sm font-bold text-foreground"
              />
            </div>

            {/* Bearing */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Bearing (WCB)</label>
              <div className="flex gap-1.5">
                <NumInput
                  label="DEG" value={newDeg} onChange={setNewDeg}
                  placeholder="000" inputMode="numeric"
                  onNext={() => minRef.current?.focus()}
                />
                <NumInput
                  label="MIN" value={newMin} onChange={setNewMin}
                  placeholder="00" inputMode="numeric"
                  inputRef={minRef} onNext={() => secRef.current?.focus()}
                />
                <NumInput
                  label="SEC" value={newSec} onChange={setNewSec}
                  placeholder="00" inputMode="numeric"
                  inputRef={secRef} onNext={() => distRef.current?.focus()}
                />
              </div>
            </div>

            {/* Distance */}
            <div className="flex gap-2 items-end">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distance (m)</label>
                <Input
                  ref={distRef}
                  type="number" inputMode="decimal"
                  value={newDist}
                  onChange={(e) => setNewDist(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addShot(); } }}
                  placeholder="0.000"
                  className="h-10 font-bold text-base text-foreground"
                />
              </div>
              <Button onClick={addShot} className="h-10 px-5 gap-1.5 shrink-0">
                <Plus size={16} /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Diagram ── */}
      {setupConfirmed && computed.length > 0 && (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardContent className="px-3 pt-4 pb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sketch Diagram</div>
            <RadiationDiagram
              setupE={setupENum}
              setupN={setupNNum}
              setupLabel={setupLabel}
              shots={computed}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Results Table ── */}
      {computed.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="px-4 pt-4 pb-4 space-y-0">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Radiated Coordinates</div>
            <div className="space-y-2">
              {computed.map((shot, i) => {
                const raw = shots.find((s) => s.id === shot.id)!;
                const dESign = shot.deltaE >= 0 ? "+" : "";
                const dNSign = shot.deltaN >= 0 ? "+" : "";
                return (
                  <div
                    key={shot.id}
                    className="bg-muted/40 border border-border rounded-xl px-3 py-2.5"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <span className="font-bold text-sm text-foreground">{shot.label}</span>
                      </div>
                      <button
                        onClick={() => deleteShot(shot.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Bearing + distance */}
                    <div className="flex gap-3 mb-1.5">
                      <div>
                        <span className="text-xs text-muted-foreground">Bearing </span>
                        <span className="font-mono font-bold text-sm text-primary">{shot.bearingStr}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Dist </span>
                        <span className="font-mono font-bold text-sm text-foreground">{shot.distance.toFixed(3)} m</span>
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <div>
                        <span className="text-xs text-muted-foreground">Easting </span>
                        <span className="font-mono font-bold text-sm text-foreground">{shot.easting.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Northing </span>
                        <span className="font-mono font-bold text-sm text-foreground">{shot.northing.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">ΔE </span>
                        <span className={`font-mono font-bold text-xs ${shot.deltaE >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                          {dESign}{shot.deltaE.toFixed(3)} m
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">ΔN </span>
                        <span className={`font-mono font-bold text-xs ${shot.deltaN >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {dNSign}{shot.deltaN.toFixed(3)} m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholder when no shots yet */}
      {setupConfirmed && shots.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Navigation size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Add a radiation shot above</p>
          <p className="text-xs mt-1">Enter bearing (WCB) and distance to compute coordinates</p>
        </div>
      )}

      {!setupConfirmed && (
        <div className="text-center py-10 text-muted-foreground">
          <MapPin size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Enter your setup station coordinates above</p>
          <p className="text-xs mt-1">Use MGA or local grid coordinates</p>
        </div>
      )}
    </div>
  );
}
