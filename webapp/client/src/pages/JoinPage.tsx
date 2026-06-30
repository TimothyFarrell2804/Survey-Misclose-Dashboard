import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { computeJoins, toCanvasPoints, labelOffset, fmtDist, ddToDMS } from "@/lib/join";
import type { JoinSession, JoinPoint } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft,
  PlusCircle, FolderOpen, MapPin, Settings2, Pencil, Check, X,
  Navigation2
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// SVG SKETCH DIAGRAM
// ═══════════════════════════════════════════════════════════════════════════════

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1="0" y1="22" x2="0" y2="-22" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="0,-26 -5,-14 5,-14" fill="currentColor" />
      <text x="0" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="inherit">N</text>
    </g>
  );
}

function JoinDiagram({
  points,
  scaleFactor,
}: {
  points: JoinPoint[];
  scaleFactor: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 360, h: 360 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(280, Math.min(width, 400)) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { w, h } = dims;
  const joins = computeJoins(points, scaleFactor);
  const canvas = toCanvasPoints(points, w, h);

  const showScaleNote = scaleFactor !== 1.0;

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="bg-card border border-border rounded-xl overflow-visible text-foreground"
        style={{ display: "block" }}
        data-testid="join-diagram"
      >
        {/* Grid lines (subtle) */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" rx="10" />

        {/* Lines between points */}
        {canvas.map((pt, i) => {
          if (i >= canvas.length - 1) return null;
          const next = canvas[i + 1];
          const join = joins[i];
          const lbl = labelOffset(pt.x, pt.y, next.x, next.y, 16);

          // Two-line label: bearing above, distance below
          const bearingText = join.gridBearingStr;
          const distText = showScaleNote
            ? `${fmtDist(join.gridDistance)} gd`
            : fmtDist(join.gridDistance);

          return (
            <g key={`line-${i}`}>
              {/* Line */}
              <line
                x1={pt.x} y1={pt.y}
                x2={next.x} y2={next.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Arrow head */}
              {(() => {
                const dx = next.x - pt.x;
                const dy = next.y - pt.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len; const uy = dy / len;
                const ax = next.x - ux * 14;
                const ay = next.y - uy * 14;
                const px = -uy * 5; const py = ux * 5;
                return (
                  <polygon
                    points={`${next.x},${next.y} ${ax + px},${ay + py} ${ax - px},${ay - py}`}
                    fill="hsl(var(--primary))"
                  />
                );
              })()}
              {/* Label group */}
              <g transform={`translate(${lbl.x},${lbl.y}) rotate(${lbl.angle})`}>
                <rect
                  x="-38" y="-19" width="76" height="28"
                  rx="4"
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.8"
                  opacity="0.9"
                />
                <text textAnchor="middle" fontSize="9.5" fontWeight="600" fill="hsl(var(--primary))" dy="-5" fontFamily="Arial, sans-serif">
                  {bearingText}
                </text>
                <text textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))" dy="7" opacity="0.85" fontFamily="Arial, sans-serif">
                  {distText}
                </text>
              </g>
            </g>
          );
        })}

        {/* Point dots + labels */}
        {canvas.map((pt, i) => (
          <g key={`pt-${i}`}>
            <circle cx={pt.x} cy={pt.y} r="7" fill="hsl(var(--primary))" opacity="0.15" />
            <circle cx={pt.x} cy={pt.y} r="4" fill="hsl(var(--primary))" />
            <rect
              x={pt.x + 8} y={pt.y - 14}
              width={pt.label.length * 7.5 + 10} height="18"
              rx="4"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="0.8"
              opacity="0.92"
            />
            <text
              x={pt.x + 13} y={pt.y - 2}
              fontSize="11"
              fontWeight="600"
              fill="hsl(var(--foreground))"
              fontFamily="Arial, sans-serif"
            >
              {pt.label}
            </text>
          </g>
        ))}

        {/* North arrow — top-right */}
        <NorthArrow x={w - 32} y={44} />

        {/* Scale factor note */}
        {showScaleNote && (
          <text x={12} y={h - 10} fontSize="9.5" fill="hsl(var(--muted-foreground))" fontFamily="Arial, sans-serif">
            SF = {scaleFactor.toFixed(6)} · gd = grid dist
          </text>
        )}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

function ResultsTable({ points, scaleFactor }: { points: JoinPoint[]; scaleFactor: number }) {
  const joins = computeJoins(points, scaleFactor);
  const showGround = scaleFactor !== 1.0;

  if (joins.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Add at least 2 points to compute joins.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="join-results-table">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Join Results</span>
      </div>
      {/* Card-style rows — better on narrow mobile */}
      <div className="divide-y divide-border">
        {joins.map((j, i) => (
          <div key={i} className="px-3 py-3" data-testid={`join-row-${i}`}>
            {/* Row header */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm text-foreground">
                {j.fromLabel} <span className="text-muted-foreground font-normal">→</span> {j.toLabel}
              </span>
              <span className="font-mono text-sm font-bold text-primary">{j.gridBearingStr}</span>
            </div>
            {/* Distances */}
            <div className="flex gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Grid: </span>
                <span className="font-bold text-foreground">{j.gridDistance.toFixed(4)} m</span>
              </div>
              {showGround && (
                <div>
                  <span className="text-muted-foreground">Ground: </span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{j.groundDistance.toFixed(4)} m</span>
                </div>
              )}
            </div>
            {/* Delta row */}
            <div className="flex gap-4 text-xs font-mono mt-1">
              <div>
                <span className="text-muted-foreground">ΔE: </span>
                <span className={j.deltaE >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}>
                  {(j.deltaE >= 0 ? "+" : "")}{j.deltaE.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ΔN: </span>
                <span className={j.deltaN >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {(j.deltaN >= 0 ? "+" : "")}{j.deltaN.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POINT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function PointCard({
  point, index, total,
  onDelete, onMoveUp, onMoveDown, onUpdate,
}: {
  point: JoinPoint; index: number; total: number;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onUpdate: (data: Partial<{ label: string; easting: number; northing: number }>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(point.label);
  const [easting, setEasting] = useState(String(point.easting));
  const [northing, setNorthing] = useState(String(point.northing));

  function handleSave() {
    onUpdate({ label, easting: parseFloat(easting) || 0, northing: parseFloat(northing) || 0 });
    setEditing(false);
  }
  function handleCancel() {
    setLabel(point.label); setEasting(String(point.easting)); setNorthing(String(point.northing));
    setEditing(false);
  }

  const displayLabel = point.label || `Point ${index + 1}`;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm" data-testid={`point-card-${point.id}`}>
      <div className="flex items-start gap-2">
        {/* Index badge */}
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>

        {editing ? (
          <div className="flex-1 flex flex-col gap-2">
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Point label (e.g. DP12345)"
              className="h-9 text-sm"
              data-testid={`input-label-${point.id}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Easting (E)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={easting}
                  onChange={e => setEasting(e.target.value)}
                  className="h-9 font-mono text-sm mt-1"
                  data-testid={`input-easting-${point.id}`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Northing (N)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={northing}
                  onChange={e => setNorthing(e.target.value)}
                  className="h-9 font-mono text-sm mt-1"
                  data-testid={`input-northing-${point.id}`}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="gap-1 h-8" data-testid={`button-save-point-${point.id}`}>
                <Check size={12} /> Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" className="gap-1 h-8">
                <X size={12} /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button className="flex-1 text-left" onClick={() => setEditing(true)} data-testid={`button-edit-point-${point.id}`}>
            <div className="font-semibold text-sm text-foreground">{displayLabel}</div>
            <div className="font-mono text-xs text-muted-foreground mt-0.5">
              E: {point.easting.toFixed(3)} &nbsp; N: {point.northing.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">Tap to edit</div>
          </button>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-1 shrink-0">
          <button className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={onMoveUp} disabled={index === 0} data-testid={`button-up-point-${point.id}`}><ChevronUp size={14} /></button>
          <button className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={onMoveDown} disabled={index === total - 1} data-testid={`button-down-point-${point.id}`}><ChevronDown size={14} /></button>
          <button className="p-1 rounded text-destructive hover:text-destructive/80" onClick={onDelete} data-testid={`button-delete-point-${point.id}`}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD POINT FORM
// ═══════════════════════════════════════════════════════════════════════════════

function AddPointForm({ sessionId, nextOrder }: { sessionId: number; nextOrder: number }) {
  const [label, setLabel] = useState("");
  const [easting, setEasting] = useState("");
  const [northing, setNorthing] = useState("");
  const { toast } = useToast();
  const eastingRef = useRef<HTMLInputElement>(null);
  const northingRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const add = useMutation({
    mutationFn: (data: object) => apiRequest("POST", `/api/joins/${sessionId}/points`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joins", sessionId, "points"] });
      setLabel(""); setEasting(""); setNorthing("");
      setTimeout(() => labelRef.current?.focus(), 50);
    },
    onError: () => toast({ title: "Failed to add point", variant: "destructive" }),
  });

  function handleAdd() {
    const e = parseFloat(easting);
    const n = parseFloat(northing);
    if (isNaN(e) || isNaN(n)) {
      toast({ title: "Enter valid easting and northing", variant: "destructive" });
      return;
    }
    add.mutate({ label: label.trim(), easting: e, northing: n, order: nextOrder });
  }

  return (
    <div className="bg-muted/40 border border-dashed border-border rounded-xl p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Navigation2 size={11} /> New Point
      </div>
      <Input
        ref={labelRef}
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); eastingRef.current?.focus(); } }}
        placeholder="Label (e.g. DP12345, optional)"
        className="mb-2 h-9 text-sm"
        data-testid="input-new-label"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Easting</label>
          <Input
            ref={eastingRef}
            type="number"
            inputMode="decimal"
            step="0.001"
            value={easting}
            onChange={e => setEasting(e.target.value)}
            placeholder="000000.000"
            className="h-10 font-bold text-base text-foreground mt-1"
            data-testid="input-new-easting"
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); northingRef.current?.focus(); }
            }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Northing</label>
          <Input
            ref={northingRef}
            type="number"
            inputMode="decimal"
            step="0.001"
            value={northing}
            onChange={e => setNorthing(e.target.value)}
            placeholder="0000000.000"
            className="h-10 font-bold text-base text-foreground mt-1"
            data-testid="input-new-northing"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
        </div>
      </div>
      <Button onClick={handleAdd} disabled={add.isPending} className="w-full gap-2 h-10" data-testid="button-add-point">
        <Plus size={16} /> Add Point
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCALE FACTOR EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function ScaleFactorBadge({ session, onChange }: { session: JoinSession; onChange: (sf: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(session.scaleFactor));

  function save() {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">SF:</span>
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          className="h-7 w-32 text-xs font-mono px-2"
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          data-testid="input-scale-factor"
        />
        <button className="p-1 text-primary" onClick={save} data-testid="button-save-sf"><Check size={13} /></button>
        <button className="p-1 text-muted-foreground" onClick={() => setEditing(false)}><X size={13} /></button>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-xs bg-muted/60 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
      onClick={() => { setVal(String(session.scaleFactor)); setEditing(true); }}
      data-testid="button-edit-sf"
    >
      <Settings2 size={11} />
      <span className="text-muted-foreground">SF:</span>
      <span className="font-mono font-medium">{session.scaleFactor.toFixed(6)}</span>
      <Pencil size={10} className="text-muted-foreground/60" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN SESSION VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function JoinSessionView({ session, onBack }: { session: JoinSession; onBack: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"points" | "diagram" | "results">("points");
  const [currentSession, setCurrentSession] = useState(session);

  const { data: points = [], isLoading } = useQuery<JoinPoint[]>({
    queryKey: ["/api/joins", session.id, "points"],
    queryFn: () => apiRequest("GET", `/api/joins/${session.id}/points`).then(r => r.json()),
  });

  const updateSession = useMutation({
    mutationFn: (data: object) => apiRequest("PATCH", `/api/joins/${session.id}`, data),
    onSuccess: async (res) => {
      const updated: JoinSession = await res.json();
      setCurrentSession(updated);
      queryClient.invalidateQueries({ queryKey: ["/api/joins"] });
    },
  });

  const deletePoint = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/joins/points/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/joins", session.id, "points"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const updatePoint = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiRequest("PATCH", `/api/joins/points/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/joins", session.id, "points"] }),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: number[]) => apiRequest("POST", `/api/joins/${session.id}/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/joins", session.id, "points"] }),
  });

  function handleMoveUp(i: number) {
    if (i === 0) return;
    const ids = points.map(p => p.id);
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
    reorder.mutate(ids);
  }
  function handleMoveDown(i: number) {
    if (i === points.length - 1) return;
    const ids = points.map(p => p.id);
    [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
    reorder.mutate(ids);
  }

  const joins = computeJoins(points, currentSession.scaleFactor);

  const TABS = [
    { key: "points", label: "Points" },
    { key: "diagram", label: "Diagram" },
    { key: "results", label: "Results" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1 -ml-1" data-testid="button-back-join">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate" data-testid="text-session-name">{currentSession.name}</h1>
            <p className="text-xs text-muted-foreground">{points.length} point{points.length !== 1 ? "s" : ""} · {joins.length} join{joins.length !== 1 ? "s" : ""}</p>
          </div>
          <ScaleFactorBadge session={currentSession} onChange={sf => updateSession.mutate({ scaleFactor: sf })} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-muted rounded-lg p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${activeTab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setActiveTab(t.key)}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto pb-32">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : activeTab === "points" ? (
          <div className="flex flex-col gap-3">
            {points.map((pt, i) => (
              <PointCard
                key={pt.id}
                point={pt}
                index={i}
                total={points.length}
                onDelete={() => deletePoint.mutate(pt.id)}
                onMoveUp={() => handleMoveUp(i)}
                onMoveDown={() => handleMoveDown(i)}
                onUpdate={(data) => updatePoint.mutate({ id: pt.id, data })}
              />
            ))}
            <AddPointForm sessionId={session.id} nextOrder={points.length + 1} />
          </div>
        ) : activeTab === "diagram" ? (
          <div className="flex flex-col gap-4">
            {points.length < 2 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Add at least 2 points to see the diagram.</p>
              </div>
            ) : (
              <>
                <JoinDiagram points={points} scaleFactor={currentSession.scaleFactor} />
                {/* Quick summary below diagram */}
                <div className="grid grid-cols-2 gap-2">
                  {joins.map((j, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-2.5">
                      <div className="text-xs font-semibold text-muted-foreground truncate">{j.fromLabel} → {j.toLabel}</div>
                      <div className="font-mono text-xs font-bold text-primary mt-0.5">{j.gridBearingStr}</div>
                      <div className="font-mono text-xs font-semibold text-foreground/80">{j.gridDistance.toFixed(3)} m</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Scale factor info box */}
            {currentSession.scaleFactor !== 1.0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Scale Factor: {currentSession.scaleFactor.toFixed(6)}</span>
                <br />Ground Distance = Grid Distance ÷ {currentSession.scaleFactor.toFixed(6)}
              </div>
            )}
            <ResultsTable points={points} scaleFactor={currentSession.scaleFactor} />
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION LIST (HOME)
// ═══════════════════════════════════════════════════════════════════════════════

function JoinSessionList({ onSelect }: { onSelect: (s: JoinSession) => void }) {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery<JoinSession[]>({
    queryKey: ["/api/joins"],
    queryFn: () => apiRequest("GET", "/api/joins").then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/joins", { name, scaleFactor: 1.0 }),
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/joins"] });
      setNewName("");
      const data: JoinSession = await res.json();
      onSelect(data);
    },
    onError: () => toast({ title: "Failed to create session", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/joins/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/joins"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function handleCreate() {
    const name = newName.trim() || `Join ${sessions.length + 1}`;
    create.mutate(name);
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* New session */}
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <PlusCircle size={11} /> New Join Session
        </div>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Lot 42 Corner Check"
            className="flex-1"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            data-testid="input-join-session-name"
          />
          <Button onClick={handleCreate} disabled={create.isPending} className="gap-1.5 shrink-0" data-testid="button-create-join-session">
            <Plus size={16} /> Create
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
        <FolderOpen size={11} /> Saved Sessions
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Navigation2 size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No join sessions yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(s => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => onSelect(s)}
              data-testid={`join-session-item-${s.id}`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation2 size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">SF: {s.scaleFactor.toFixed(6)}</div>
              </div>
              <button
                className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg"
                onClick={e => { e.stopPropagation(); del.mutate(s.id); }}
                data-testid={`button-delete-join-${s.id}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function JoinPage() {
  const [selected, setSelected] = useState<JoinSession | null>(null);
  return selected
    ? <JoinSessionView session={selected} onBack={() => setSelected(null)} />
    : <JoinSessionList onSelect={setSelected} />;
}
