import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { computeTraverse, formatBearingDMS, bearingToDMS } from "@/lib/traverse";
import type { Traverse, Leg } from "@shared/schema";
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
function AddLegForm({ traverseId, nextOrder }: { traverseId: number; nextOrder: number }) {
  const [form, setForm] = useState<LegFormState>(DEFAULT_LEG);
  const { toast } = useToast();
  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);
  const distRef = useRef<HTMLInputElement>(null);

  const addLeg = useMutation({
    mutationFn: (data: object) => apiRequest("POST", `/api/traverses/${traverseId}/legs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/traverses", traverseId, "legs"] });
      setForm(DEFAULT_LEG);
      // refocus DEG after add
      setTimeout(() => document.querySelector<HTMLInputElement>("[data-testid='input-new-deg']")?.focus(), 50);
    },
    onError: () => toast({ title: "Failed to add traverse line", variant: "destructive" }),
  });

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
    addLeg.mutate({
      bearingDeg: deg, bearingMin: min, bearingSec: sec,
      distance: dist, order: nextOrder,
    });
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
          disabled={addLeg.isPending}
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

// Wire refs from BearingInput to the ref objects in AddLegForm
// (done via forwardRef for minRef/secRef — here we use data-testid approach above for simplicity)

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
  const [activeTab, setActiveTab] = useState<"legs" | "results">("legs");

  const { data: legs = [], isLoading } = useQuery<Leg[]>({
    queryKey: ["/api/traverses", traverse.id, "legs"],
    queryFn: () => apiRequest("GET", `/api/traverses/${traverse.id}/legs`).then(r => r.json()),
  });

  const deleteLeg = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/legs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/traverses", traverse.id, "legs"] }),
    onError: () => toast({ title: "Failed to delete traverse line", variant: "destructive" }),
  });

  const updateLeg = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiRequest("PATCH", `/api/legs/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/traverses", traverse.id, "legs"] }),
    onError: () => toast({ title: "Failed to update traverse line", variant: "destructive" }),
  });

  const reorderLegs = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiRequest("POST", `/api/traverses/${traverse.id}/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/traverses", traverse.id, "legs"] }),
  });

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const ids = legs.map(l => l.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderLegs.mutate(ids);
  }

  function handleMoveDown(index: number) {
    if (index === legs.length - 1) return;
    const ids = legs.map(l => l.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderLegs.mutate(ids);
  }

  function handleUpdate(leg: Leg, field: string, value: string) {
    const numVal = field === "bearingDeg" || field === "bearingMin"
      ? parseInt(value) || 0
      : parseFloat(value) || 0;
    updateLeg.mutate({ id: leg.id, data: { [field]: numVal } });
  }

  const result = computeTraverse(legs);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1 -ml-1" data-testid="button-back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate" data-testid="text-traverse-name">{traverse.name}</h1>
            <p className="text-xs text-muted-foreground">{legs.length} traverse line{legs.length !== 1 ? "s" : ""}</p>
          </div>
          {result && (
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">Precision</div>
              <div className="text-sm font-bold font-mono text-primary" data-testid="text-header-precision">{result.precisionStr}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-muted rounded-lg p-1">
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
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto pb-32">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : activeTab === "legs" ? (
          <div className="flex flex-col gap-3">
            {legs.map((leg, i) => (
              <LegCard
                key={leg.id}
                leg={leg}
                index={i}
                total={legs.length}
                onDelete={() => deleteLeg.mutate(leg.id)}
                onMoveUp={() => handleMoveUp(i)}
                onMoveDown={() => handleMoveDown(i)}
                onUpdate={(field, value) => handleUpdate(leg, field, value)}
              />
            ))}
            <AddLegForm traverseId={traverse.id} nextOrder={legs.length + 1} />
          </div>
        ) : (
          <ResultsPanel legs={legs} />
        )}
      </main>
    </div>
  );
}

// ===================== TRAVERSE LIST =====================
function TraverseList({ onSelect, hideHeader }: { onSelect: (t: Traverse) => void; hideHeader?: boolean }) {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const { data: traverses = [], isLoading } = useQuery<Traverse[]>({
    queryKey: ["/api/traverses"],
    queryFn: () => apiRequest("GET", "/api/traverses").then(r => r.json()),
  });

  const createTraverse = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/traverses", { name }),
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/traverses"] });
      setNewName("");
      const data: Traverse = await res.json();
      onSelect(data);
    },
    onError: () => toast({ title: "Failed to create traverse", variant: "destructive" }),
  });

  const deleteTraverse = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/traverses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/traverses"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function handleCreate() {
    const name = newName.trim() || `Traverse ${traverses.length + 1}`;
    createTraverse.mutate(name);
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
            <Button onClick={handleCreate} disabled={createTraverse.isPending} className="gap-1.5 shrink-0" data-testid="button-create-traverse">
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

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : traverses.length === 0 ? (
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
                  onClick={(e) => { e.stopPropagation(); deleteTraverse.mutate(t.id); }}
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
