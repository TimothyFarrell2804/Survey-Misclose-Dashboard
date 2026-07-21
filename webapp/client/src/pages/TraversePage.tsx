import { useState, useEffect, useRef } from "react";
import { computeTraverse, formatBearingDMS, bearingToDMS } from "@/lib/traverse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronUp, ChevronDown, MapPin,
  BarChart2, AlertTriangle, CheckCircle2, XCircle, Info, PlusCircle, FolderOpen,
  Navigation, Ruler, ArrowLeft
} from "lucide-react";

// ===================== LOCAL TYPES =====================
interface Leg {
  id: number;
  traverseId: number;
  bearingDeg: number;
  bearingMin: number;
  bearingSec: number;
  distance: number;
  order: number;
}

interface Traverse {
  id: number;
  name: string;
  createdAt: string;
  legs: Leg[];
}

interface StorageData {
  traverses: Traverse[];
}

// ===================== LOCALSTORAGE HELPERS =====================
const STORAGE_KEY = "survey_cogo_traverses";

function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StorageData;
  } catch {
    // ignore parse errors
  }
  return { traverses: [] };
}

function saveData(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===================== TYPES =====================
interface LegFormState {
  bearingDeg: string;
  bearingMin: string;
  bearingSec: string;
  distance: string;
}

const DEFAULT_LEG: LegFormState = { bearingDeg: "", bearingMin: "", bearingSec: "", distance: "" };

// ===================== BEARING INPUT =====================
function BearingInput({
  label,
  value,
  onChange,
  placeholder,
  max,
  dataTestId,
  onNext,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max: number;
  dataTestId?: string;
  onNext?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1 flex-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <Input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === "Tab") && onNext) {
            e.preventDefault();
            onNext();
          }
        }}
        placeholder={placeholder}
        className="text-center font-bold text-base h-11 text-foreground"
        data-testid={dataTestId}
      />
    </div>
  );
}

// ===================== LEG CARD =====================
function LegCard({
  leg,
  index,
  total,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  leg: Leg;
  index: number;
  total: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LegFormState>({
    bearingDeg: String(leg.bearingDeg),
    bearingMin: String(leg.bearingMin),
    bearingSec: String(leg.bearingSec),
    distance: String(leg.distance),
  });

  const bearing = formatBearingDMS(leg.bearingDeg, leg.bearingMin, leg.bearingSec);

  function handleSave() {
    onUpdate("bearingDeg", form.bearingDeg);
    onUpdate("bearingMin", form.bearingMin);
    onUpdate("bearingSec", form.bearingSec);
    onUpdate("distance", form.distance);
    setEditing(false);
  }

  return (
    <div className="leg-card bg-card border border-border rounded-xl p-3 shadow-sm" data-testid={`leg-card-${leg.id}`}>
      <div className="flex items-center gap-2">
        {/* Line number badge */}
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>

        {editing ? (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex gap-1">
              <BearingInput label="DEG" value={form.bearingDeg} onChange={(v) => setForm(f => ({ ...f, bearingDeg: v }))} placeholder="0" max={359} dataTestId={`input-deg-${leg.id}`}
                onNext={() => document.querySelector<HTMLInputElement>(`[data-testid="input-min-${leg.id}"]`)?.focus()} />
              <BearingInput label="MIN" value={form.bearingMin} onChange={(v) => setForm(f => ({ ...f, bearingMin: v }))} placeholder="00" max={59} dataTestId={`input-min-${leg.id}`}
                onNext={() => document.querySelector<HTMLInputElement>(`[data-testid="input-sec-${leg.id}"]`)?.focus()} />
              <BearingInput label="SEC" value={form.bearingSec} onChange={(v) => setForm(f => ({ ...f, bearingSec: v }))} placeholder="00" max={59} dataTestId={`input-sec-${leg.id}`}
                onNext={() => document.querySelector<HTMLInputElement>(`[data-testid="input-dist-${leg.id}"]`)?.focus()} />
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DISTANCE (m)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.001}
                  value={form.distance}
                  onChange={(e) => setForm(f => ({ ...f, distance: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  placeholder="0.000"
                  className="font-bold text-base h-11 text-foreground"
                  data-testid={`input-dist-${leg.id}`}
                />
              </div>
              <Button onClick={handleSave} size="sm" className="mt-5 h-11 px-4" data-testid={`button-save-${leg.id}`}>Save</Button>
            </div>
          </div>
        ) : (
          <button
            className="flex-1 text-left"
            onClick={() => setEditing(true)}
            data-testid={`button-edit-${leg.id}`}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm font-bold text-foreground">{bearing}</span>
              <span className="font-mono text-sm font-semibold text-foreground/80">{leg.distance.toFixed(3)} m</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Tap to edit</div>
          </button>
        )}

        {/* Reorder / delete buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={onMoveUp}
            disabled={index === 0}
            data-testid={`button-up-${leg.id}`}
          >
            <ChevronUp size={14} />
          </button>
          <button
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={onMoveDown}
            disabled={index === total - 1}
            data-testid={`button-down-${leg.id}`}
          >
            <ChevronDown size={14} />
          </button>
          <button
            className="p-1 rounded text-destructive hover:text-destructive/80"
            onClick={onDelete}
            data-testid={`button-delete-${leg.id}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== ADD TRAVERSE LINE FORM =====================
function AddLegForm({
  traverseId,
  nextOrder,
  onAdd,
}: {
  traverseId: number;
  nextOrder: number;
  onAdd: (leg: Omit<Leg, "id" | "traverseId">) => void;
}) {
  const [form, setForm] = useState<LegFormState>(DEFAULT_LEG);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);
  const distRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const deg = parseInt(form.bearingDeg) || 0;
    const min = parseInt(form.bearingMin) || 0;
    const sec = Math.round(parseFloat(form.bearingSec) || 0);
    const dist = parseFloat(form.distance);
    if (isNaN(dist) || dist <= 0) {
      toast({ title: "Enter a valid distance", variant: "destructive" });
      return;
    }
    if (deg < 0 || deg > 359 || min < 0 || min > 59 || sec < 0 || sec >= 60) {
      toast({ title: "Check bearing values (DEG 0-359, MIN/SEC 0-59)", variant: "destructive" });
      return;
    }
    setIsPending(true);
    onAdd({ bearingDeg: deg, bearingMin: min, bearingSec: sec, distance: dist, order: nextOrder });
    setForm(DEFAULT_LEG);
    setIsPending(false);
    setTimeout(() => document.querySelector<HTMLInputElement>("[data-testid='input-new-deg']")?.focus(), 50);
  }

  return (
    <div className="bg-muted/40 border border-dashed border-border rounded-xl p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Navigation size={11} />
        New Traverse Line — Bearing &amp; Distance
      </div>
      <div className="flex gap-1 mb-2">
        <BearingInput label="DEG" value={form.bearingDeg} onChange={(v) => setForm(f => ({ ...f, bearingDeg: v }))} placeholder="0" max={359} dataTestId="input-new-deg"
          onNext={() => minRef.current?.focus()} />
        <BearingInput label="MIN" value={form.bearingMin} onChange={(v) => setForm(f => ({ ...f, bearingMin: v }))} placeholder="00" max={59} dataTestId="input-new-min"
          inputRef={minRef} onNext={() => secRef.current?.focus()} />
        <BearingInput label="SEC" value={form.bearingSec} onChange={(v) => setForm(f => ({ ...f, bearingSec: v }))} placeholder="00" max={59} dataTestId="input-new-sec"
          inputRef={secRef} onNext={() => distRef.current?.focus()} />
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Ruler size={10} /> DIST (m)
          </label>
          <Input
            ref={distRef}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.001}
            value={form.distance}
            onChange={(e) => setForm(f => ({ ...f, distance: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="0.000"
            className="font-bold text-base h-11 text-foreground"
            data-testid="input-new-dist"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={isPending}
          className="mt-5 h-11 gap-1.5"
          data-testid="button-add-leg"
        >
          <Plus size={16} />
          Add
        </Button>
      </div>
    </div>
  );
}


// ===================== TRAVERSE DIAGRAM =====================
function TraverseDiagram({ legs }: { legs: Leg[] }) {
  if (legs.length < 2) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Info size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Add at least 2 traverse lines to see the diagram.</p>
      </div>
    );
  }

  // Build coordinate chain starting from origin (0,0)
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (const leg of legs) {
    const ddRad = (leg.bearingDeg + leg.bearingMin / 60 + leg.bearingSec / 3600) * (Math.PI / 180);
    const prev = pts[pts.length - 1];
    pts.push({
      x: prev.x + leg.distance * Math.sin(ddRad),
      y: prev.y + leg.distance * Math.cos(ddRad),
    });
  }

  // Canvas sizing
  const PAD = 48;
  const W = 320;
  const H = 320;
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((W - PAD * 2) / rangeX, (H - PAD * 2) / rangeY);

  function toSvg(x: number, y: number) {
    return {
      sx: PAD + (x - minX) * scale,
      sy: H - PAD - (y - minY) * scale,
    };
  }

  const svgPts = pts.map(p => toSvg(p.x, p.y));
  const last = svgPts[svgPts.length - 1];
  const first = svgPts[0];

  // Misclose vector (close back to start)
  const miscloseX = pts[0].x - pts[pts.length - 1].x;
  const miscloseY = pts[0].y - pts[pts.length - 1].y;
  const miscloseLen = Math.sqrt(miscloseX * miscloseX + miscloseY * miscloseY);
  const hasMisclose = miscloseLen > 0.001;

  // Midpoint label helper
  function midLabel(a: { sx: number; sy: number }, b: { sx: number; sy: number }, i: number) {
    const mx = (a.sx + b.sx) / 2;
    const my = (a.sy + b.sy) / 2;
    const leg = legs[i];
    const bearing = `${leg.bearingDeg}°${String(leg.bearingMin).padStart(2,"0")}'${String(leg.bearingSec).padStart(2,"0")}"`;
    const dist = `${leg.distance.toFixed(2)}m`;
    return { mx, my, bearing, dist };
  }

  // Arrow marker helper
  function arrowHead(ax: number, ay: number, bx: number, by: number, color: string, id: string) {
    const angle = Math.atan2(by - ay, bx - ax);
    const len = 9;
    const spread = 0.4;
    const x1 = bx - len * Math.cos(angle - spread);
    const y1 = by - len * Math.sin(angle - spread);
    const x2 = bx - len * Math.cos(angle + spread);
    const y2 = by - len * Math.sin(angle + spread);
    return <polygon key={id} points={`${bx},${by} ${x1},${y1} ${x2},${y2}`} fill={color} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Traverse Diagram</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f, i) => (
            <g key={i} stroke="#e5e7eb" strokeWidth="0.5">
              <line x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} />
              <line x1={PAD + f * (W - PAD * 2)} y1={PAD} x2={PAD + f * (W - PAD * 2)} y2={H - PAD} />
            </g>
          ))}

          {/* Traverse lines with arrows */}
          {svgPts.slice(0, -1).map((a, i) => {
            const b = svgPts[i + 1];
            return (
              <g key={i}>
                <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#2D3580" strokeWidth="2" strokeLinecap="round" />
                {arrowHead(a.sx, a.sy, b.sx, b.sy, "#2D3580", `arr-${i}`)}
              </g>
            );
          })}

          {/* Misclose dashed line */}
          {hasMisclose && (
            <g>
              <line x1={last.sx} y1={last.sy} x2={first.sx} y2={first.sy}
                stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" strokeLinecap="round" />
              {arrowHead(last.sx, last.sy, first.sx, first.sy, "#ef4444", "arr-misclose")}
            </g>
          )}

          {/* Points */}
          {svgPts.map((p, i) => (
            <g key={i}>
              <circle cx={p.sx} cy={p.sy} r={i === 0 ? 6 : 4}
                fill={i === 0 ? "#2D3580" : "#3A7EC4"} />
              <text x={p.sx} y={p.sy - 8} textAnchor="middle"
                fontSize="9" fontWeight="700" fill="#2D3580">
                {i + 1}
              </text>
            </g>
          ))}

          {/* Bearing + distance mid-labels */}
          {svgPts.slice(0, -1).map((a, i) => {
            const b = svgPts[i + 1];
            const { mx, my, bearing, dist } = midLabel(a, b, i);
            // Offset label perpendicular to line
            const angle = Math.atan2(b.sy - a.sy, b.sx - a.sx);
            const ox = -Math.sin(angle) * 14;
            const oy = Math.cos(angle) * 14;
            return (
              <g key={i}>
                <text x={mx + ox} y={my + oy - 5} textAnchor="middle" fontSize="7.5" fill="#2D3580" fontWeight="600">{bearing}</text>
                <text x={mx + ox} y={my + oy + 5} textAnchor="middle" fontSize="7.5" fill="#3A7EC4">{dist}</text>
              </g>
            );
          })}

          {/* North arrow */}
          <g>
            <line x1={W - 18} y1={H - 18} x2={W - 18} y2={H - 38} stroke="#2D3580" strokeWidth="2" strokeLinecap="round" />
            <polygon points={`${W - 18},${H - 40} ${W - 21},${H - 32} ${W - 15},${H - 32}`} fill="#3A7EC4" />
            <text x={W - 18} y={H - 43} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2D3580">N</text>
          </g>

          {/* Start label */}
          <text x={svgPts[0].sx} y={svgPts[0].sy + 16} textAnchor="middle" fontSize="8" fill="#2D3580" fontWeight="700">START</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-muted/40 rounded-xl px-3 py-2 text-xs text-muted-foreground flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#2D3580" strokeWidth="2"/></svg>
          <span>Traverse lines (with bearing &amp; distance)</span>
        </div>
        {hasMisclose && (
          <div className="flex items-center gap-2">
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2"/></svg>
            <span>Misclose vector (back to start)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== RESULTS PANEL =====================
function QualityBadge({ quality }: { quality: "excellent" | "good" | "fair" | "poor" }) {
  const config = {
    excellent: { label: "Excellent", icon: CheckCircle2, cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
    good: { label: "Good", icon: CheckCircle2, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
    fair: { label: "Fair", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    poor: { label: "Poor", icon: XCircle, cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  }[quality];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${config.cls}`}>
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function ResultsPanel({ legs }: { legs: Leg[] }) {
  const result = computeTraverse(legs);

  if (legs.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Add at least 2 traverse lines to compute the misclose.</p>
      </div>
    );
  }

  if (!result) return null;

  const eSign = result.sumEasting >= 0 ? "+" : "";
  const nSign = result.sumNorthing >= 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-3" data-testid="results-panel">
      {/* Precision headline */}
      <div className="bg-primary/8 rounded-xl p-4 border border-primary/20 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Precision</div>
          <div className="text-2xl font-bold font-mono text-primary" data-testid="text-precision">
            {result.precisionStr}
          </div>
        </div>
        <QualityBadge quality={result.quality} />
      </div>

      {/* Misclose */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Linear Misclose</div>
          <div className="font-mono font-semibold text-sm" data-testid="text-misclose-dist">{result.miscloseDistStr}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Misclose Direction</div>
          <div className="font-mono font-semibold text-sm" data-testid="text-misclose-dir">{result.miscloseDirectionStr}</div>
        </div>
      </div>

      {/* Coordinate sums */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ΣΔE</div>
          <div className="font-mono text-sm" data-testid="text-sum-e">{eSign}{result.sumEasting.toFixed(4)} m</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ΣΔN</div>
          <div className="font-mono text-sm" data-testid="text-sum-n">{nSign}{result.sumNorthing.toFixed(4)} m</div>
        </div>
      </div>

      {/* Total distance */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Perimeter Distance</div>
        <div className="font-mono text-sm font-bold text-foreground" data-testid="text-total-dist">{result.totalDist.toFixed(3)} m</div>
      </div>

      {/* Leg breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traverse Line Breakdown</span>
        </div>
        <div className="divide-y divide-border">
          {result.coords.map((c, i) => (
            <div key={i} className="flex items-center px-3 py-2 text-xs gap-3" data-testid={`leg-breakdown-${i}`}>
              <span className="w-5 text-center font-semibold text-muted-foreground">{i + 1}</span>
              <span className="font-mono text-foreground w-24">{bearingToDMS(c.bearingDD)}</span>
              <div className="flex gap-2 ml-auto font-mono text-muted-foreground">
                <span className={c.easting >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}>
                  E: {(c.easting >= 0 ? "+" : "")}{c.easting.toFixed(3)}
                </span>
                <span className={c.northing >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  N: {(c.northing >= 0 ? "+" : "")}{c.northing.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== TRAVERSE VIEW =====================
function TraverseView({ traverse, onBack }: { traverse: Traverse; onBack: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"legs" | "results" | "diagram">("legs");
  const [legs, setLegs] = useState<Leg[]>(() => {
    const data = loadData();
    const t = data.traverses.find(x => x.id === traverse.id);
    return t ? [...t.legs].sort((a, b) => a.order - b.order) : [];
  });

  // Persist legs changes back into storage
  function persistLegs(updatedLegs: Leg[]) {
    const data = loadData();
    const idx = data.traverses.findIndex(x => x.id === traverse.id);
    if (idx !== -1) {
      data.traverses[idx].legs = updatedLegs;
      saveData(data);
    }
    setLegs([...updatedLegs]);
  }

  function handleAddLeg(leg: Omit<Leg, "id" | "traverseId">) {
    const newLeg: Leg = { ...leg, id: Date.now(), traverseId: traverse.id };
    const updated = [...legs, newLeg];
    persistLegs(updated);
  }

  function handleDeleteLeg(id: number) {
    const updated = legs.filter(l => l.id !== id);
    persistLegs(updated);
  }

  function handleUpdateLeg(leg: Leg, field: string, value: string) {
    const numVal = field === "bearingDeg" || field === "bearingMin"
      ? parseInt(value) || 0
      : parseFloat(value) || 0;
    const updated = legs.map(l => l.id === leg.id ? { ...l, [field]: numVal } : l);
    persistLegs(updated);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...legs];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Re-assign order values
    const reordered = updated.map((l, i) => ({ ...l, order: i + 1 }));
    persistLegs(reordered);
  }

  function handleMoveDown(index: number) {
    if (index === legs.length - 1) return;
    const updated = [...legs];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reordered = updated.map((l, i) => ({ ...l, order: i + 1 }));
    persistLegs(reordered);
  }

  const result = computeTraverse(legs);

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header: back + traverse name + tabs — sits below the Treasco header */}
      <div className="sticky top-[72px] z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1 -ml-1" data-testid="button-back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm truncate" data-testid="text-traverse-name">{traverse.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{legs.length} line{legs.length !== 1 ? "s" : ""}</span>
          </div>
          {result && (
            <span className="text-xs font-bold font-mono text-primary shrink-0" data-testid="text-header-precision">{result.precisionStr}</span>
          )}
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${activeTab === "legs" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("legs")}
            data-testid="tab-legs"
          >
            Lines
          </button>
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${activeTab === "results" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("results")}
            data-testid="tab-results"
          >
            Results
          </button>
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${activeTab === "diagram" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("diagram")}
            data-testid="tab-diagram"
          >
            Diagram
          </button>
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto pb-32">
        {activeTab === "legs" ? (
          <div className="flex flex-col gap-3">
            {legs.map((leg, i) => (
              <LegCard
                key={leg.id}
                leg={leg}
                index={i}
                total={legs.length}
                onDelete={() => handleDeleteLeg(leg.id)}
                onMoveUp={() => handleMoveUp(i)}
                onMoveDown={() => handleMoveDown(i)}
                onUpdate={(field, value) => handleUpdateLeg(leg, field, value)}
              />
            ))}
            <AddLegForm traverseId={traverse.id} nextOrder={legs.length + 1} onAdd={handleAddLeg} />
          </div>
        ) : activeTab === "results" ? (
          <ResultsPanel legs={legs} />
        ) : (
          <TraverseDiagram legs={legs} />
        )}
      </main>
    </div>
  );
}

// ===================== TRAVERSE LIST =====================
function TraverseList({ onSelect, hideHeader }: { onSelect: (t: Traverse) => void; hideHeader?: boolean }) {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const [traverses, setTraverses] = useState<Traverse[]>(() => loadData().traverses);

  function refreshTraverses() {
    setTraverses(loadData().traverses);
  }

  function handleCreate() {
    const data = loadData();
    const name = newName.trim() || `Traverse ${data.traverses.length + 1}`;
    const newTraverse: Traverse = {
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      legs: [],
    };
    data.traverses.push(newTraverse);
    saveData(data);
    setNewName("");
    refreshTraverses();
    onSelect(newTraverse);
  }

  function handleDelete(id: number) {
    const data = loadData();
    data.traverses = data.traverses.filter(t => t.id !== id);
    saveData(data);
    refreshTraverses();
  }

  return (
    <div className="bg-background">
      <main className="px-4 py-4 max-w-lg mx-auto">
        {/* New traverse */}
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <PlusCircle size={11} /> New Traverse
          </div>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Block 42 Boundary"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              data-testid="input-traverse-name"
            />
            <Button onClick={handleCreate} className="gap-1.5 shrink-0" data-testid="button-create-traverse">
              <Plus size={16} /> Create
            </Button>
          </div>
        </div>

        {/* Traverse list */}
        <div className="mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <FolderOpen size={11} /> Saved Traverses
          </div>
        </div>

        {traverses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No traverses yet</p>
            <p className="text-xs mt-1">Create one above to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {traverses.map((t) => (
              <div
                key={t.id}
                className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => onSelect(t)}
                data-testid={`traverse-item-${t.id}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.createdAt
                      ? new Date(t.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                      : ""}
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  data-testid={`button-delete-traverse-${t.id}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Help */}
        <div className="mt-6 p-3 bg-muted/40 rounded-xl border border-border/50 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1"><Info size={11} /> How to use</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a new traverse and name it</li>
            <li>Add each traverse line — enter the whole-circle bearing (DMS) and horizontal distance</li>
            <li>Switch to the Results tab to see misclose &amp; precision</li>
          </ol>
          <p className="mt-2">Precision = Total Distance ÷ Linear Misclose (1:X ratio)</p>
        </div>
      </main>
    </div>
  );
}

// ===================== PAGE ROOT =====================
export default function TraversePage({ hideHeader }: { hideHeader?: boolean }) {
  const [selected, setSelected] = useState<Traverse | null>(null);

  return selected
    ? <TraverseView traverse={selected} onBack={() => setSelected(null)} />
    : <TraverseList onSelect={setSelected} hideHeader={hideHeader} />;
}
