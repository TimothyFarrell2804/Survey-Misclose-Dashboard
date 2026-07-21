import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronUp, ChevronDown, FileText, CheckCircle2,
  XCircle, AlertTriangle, Upload, RotateCw, Ruler, Info, Download,
  Navigation,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const LINK_TO_METRE = 0.201168;
const HA_TO_M2 = 10000;
const ACRE_TO_M2 = 4046.8564224;
const PERCH_TO_M2 = ACRE_TO_M2 / 160;
const ROOD_TO_M2 = ACRE_TO_M2 / 4;

// Shoelace formula — signed area from coordinate chain
function shoelaceM2(pts: { x: number; y: number }[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function toArpFromM2(m2: number): { acres: number; roods: number; perches: number; remM2: number } {
  const totalPerches = m2 / PERCH_TO_M2;
  const acres   = Math.floor(totalPerches / 160);
  const roods   = Math.floor((totalPerches - acres * 160) / 40);
  const perches = Math.floor(totalPerches - acres * 160 - roods * 40);
  const remM2   = m2 - (acres * 160 + roods * 40 + perches) * PERCH_TO_M2;
  return { acres, roods, perches, remM2 };
}

// ─── SSIR 2024 s.26(3) tolerance table ────────────────────────────────────────
// For partially compiled parcels. Returns max misclose vector length in metres.
// ppm = parts per million of perimeter
function compiledTolerance(
  yearOfSurvey: number,
  terrain: "level" | "steep",
  perimetre: number // metres
): { formula: string; maxMetres: number } {
  if (yearOfSurvey <= 1862) {
    const ppm = terrain === "level" ? 1000 : 2000;
    return {
      formula: `${ppm} ppm of perimeter`,
      maxMetres: (ppm / 1_000_000) * perimetre,
    };
  } else if (yearOfSurvey <= 1975) {
    const ppm = terrain === "level" ? 500 : 1320;
    return {
      formula: `${ppm} ppm of perimeter`,
      maxMetres: (ppm / 1_000_000) * perimetre,
    };
  } else if (yearOfSurvey <= 2001) {
    const ppm = terrain === "level" ? 500 : 1000;
    return {
      formula: `${ppm} ppm of perimeter`,
      maxMetres: (ppm / 1_000_000) * perimetre,
    };
  } else {
    // 2001 to present: 60mm + 400 ppm
    const val = 0.060 + (400 / 1_000_000) * perimetre;
    return {
      formula: "60 mm + 400 ppm of perimeter",
      maxMetres: val,
    };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Line {
  id: number;
  bearingDeg: string;
  bearingMin: string;
  bearingSec: string;
  distanceRaw: string;   // as entered
  unit: "metres" | "links";
}

const newLine = (): Line => ({
  id: Date.now() + Math.random(),
  bearingDeg: "",
  bearingMin: "",
  bearingSec: "",
  distanceRaw: "",
  unit: "metres",
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dmsToDD(d: number, m: number, s: number): number {
  return d + m / 60 + s / 3600;
}

function ddToDMS(dd: number): { d: number; m: number; s: number } {
  const d = Math.floor(dd);
  const mTotal = (dd - d) * 60;
  const m = Math.floor(mTotal);
  const s = Math.round((mTotal - m) * 60);
  return { d, m, s };
}

function fmtDMS(d: number, m: number, s: number): string {
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

function linesToMetres(raw: number, unit: "metres" | "links"): number {
  return unit === "links" ? raw * LINK_TO_METRE : raw;
}

// ─── Mini input ───────────────────────────────────────────────────────────────
function TinyInput({
  label, value, onChange, placeholder, max, testId, onNext, inputRef,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; max?: number; testId?: string;
  onNext?: () => void; inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-0.5 flex-1">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <Input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === "Tab") && onNext) { e.preventDefault(); onNext(); } }}
        placeholder={placeholder}
        className="text-center font-bold text-sm h-10 text-foreground"
        data-testid={testId}
      />
    </div>
  );
}

// ─── Line row ─────────────────────────────────────────────────────────────────
function LineRow({
  line, index, total, rotationDD,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  line: Line; index: number; total: number; rotationDD: number;
  onChange: (l: Line) => void;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const deg = parseInt(line.bearingDeg) || 0;
  const min = parseInt(line.bearingMin) || 0;
  const sec = Math.round(parseFloat(line.bearingSec) || 0);
  const rawDD = dmsToDD(deg, min, sec);
  const adjustedDD = (rawDD + rotationDD + 360) % 360;
  const adj = ddToDMS(adjustedDD);

  const distM = linesToMetres(parseFloat(line.distanceRaw) || 0, line.unit);
  const distLinks = distM / LINK_TO_METRE;

  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);
  const distRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <span className="text-xs text-muted-foreground font-medium flex-1">
          {rotationDD !== 0 && (
            <span className="text-primary font-semibold ml-1">
              → adj {fmtDMS(adj.d, adj.m, adj.s)}
            </span>
          )}
        </span>
        {/* Unit toggle */}
        <div className="flex rounded overflow-hidden border border-border text-[10px] font-semibold">
          <button
            className={`px-2 py-1 transition-colors ${line.unit === "metres" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            onClick={() => onChange({ ...line, unit: "metres" })}
          >m</button>
          <button
            className={`px-2 py-1 transition-colors ${line.unit === "links" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            onClick={() => onChange({ ...line, unit: "links" })}
          >lk</button>
        </div>
        {/* Reorder / delete */}
        <div className="flex gap-0.5">
          <button className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={onMoveUp} disabled={index === 0}><ChevronUp size={13} /></button>
          <button className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={onMoveDown} disabled={index === total - 1}><ChevronDown size={13} /></button>
          <button className="p-1 text-destructive hover:text-destructive/80" onClick={onDelete}><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="flex gap-1">
        <TinyInput label="DEG" value={line.bearingDeg} onChange={v => onChange({ ...line, bearingDeg: v })}
          placeholder="0" max={359} onNext={() => minRef.current?.focus()} />
        <TinyInput label="MIN" value={line.bearingMin} onChange={v => onChange({ ...line, bearingMin: v })}
          placeholder="00" max={59} inputRef={minRef} onNext={() => secRef.current?.focus()} />
        <TinyInput label="SEC" value={line.bearingSec} onChange={v => onChange({ ...line, bearingSec: v })}
          placeholder="00" max={59} inputRef={secRef} onNext={() => distRef.current?.focus()} />
        <div className="flex flex-col gap-0.5 flex-[1.4]">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            DIST ({line.unit === "metres" ? "m" : "lk"})
          </label>
          <Input
            ref={distRef}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.001}
            value={line.distanceRaw}
            onChange={e => onChange({ ...line, distanceRaw: e.target.value })}
            placeholder="0.000"
            className="font-bold text-sm h-10 text-foreground"
          />
        </div>
      </div>

      {/* Conversion hint */}
      {line.distanceRaw !== "" && parseFloat(line.distanceRaw) > 0 && (
        <div className="mt-1.5 flex gap-3 text-[10px] text-muted-foreground font-mono">
          <span>{distM.toFixed(4)} m</span>
          <span>{distLinks.toFixed(4)} lk</span>
        </div>
      )}
    </div>
  );
}

// ─── SVG Diagram ──────────────────────────────────────────────────────────────
function CompiledDiagram({ lines, rotationDD }: { lines: Line[]; rotationDD: number }) {
  const PAD = 44;
  const W = 320;
  const H = 320; // extra height for area label at bottom

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (const line of lines) {
    const deg = parseInt(line.bearingDeg) || 0;
    const min = parseInt(line.bearingMin) || 0;
    const sec = Math.round(parseFloat(line.bearingSec) || 0);
    const dd = (dmsToDD(deg, min, sec) + rotationDD + 360) % 360;
    const rad = dd * (Math.PI / 180);
    const dist = linesToMetres(parseFloat(line.distanceRaw) || 0, line.unit);
    const prev = pts[pts.length - 1];
    pts.push({ x: prev.x + dist * Math.sin(rad), y: prev.y + dist * Math.cos(rad) });
  }

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((W - PAD * 2) / rangeX, (H - PAD * 2) / rangeY);

  function toSvg(x: number, y: number) {
    return { sx: PAD + (x - minX) * scale, sy: H - PAD - (y - minY) * scale };
  }

  const svgPts = pts.map(p => toSvg(p.x, p.y));
  const last = svgPts[svgPts.length - 1];
  const first = svgPts[0];
  const dx = pts[0].x - pts[pts.length - 1].x;
  const dy = pts[0].y - pts[pts.length - 1].y;
  const hasMisclose = Math.sqrt(dx * dx + dy * dy) > 0.001;

  function arrow(ax: number, ay: number, bx: number, by: number, color: string, key: string) {
    const angle = Math.atan2(by - ay, bx - ax);
    const len = 9;
    const sp = 0.4;
    return <polygon key={key} points={`${bx},${by} ${bx - len * Math.cos(angle - sp)},${by - len * Math.sin(angle - sp)} ${bx - len * Math.cos(angle + sp)},${by - len * Math.sin(angle + sp)}`} fill={color} />;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
      {svgPts.slice(0, -1).map((a, i) => {
        const b = svgPts[i + 1];
        return (
          <g key={i}>
            <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#2D3580" strokeWidth="2" strokeLinecap="round" />
            {arrow(a.sx, a.sy, b.sx, b.sy, "#2D3580", `a${i}`)}
          </g>
        );
      })}
      {hasMisclose && (
        <g>
          <line x1={last.sx} y1={last.sy} x2={first.sx} y2={first.sy} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" strokeLinecap="round" />
          {arrow(last.sx, last.sy, first.sx, first.sy, "#ef4444", "am")}
        </g>
      )}
      {svgPts.map((p, i) => (
        <g key={i}>
          <circle cx={p.sx} cy={p.sy} r={i === 0 ? 6 : 4} fill={i === 0 ? "#2D3580" : "#3A7EC4"} />
          <text x={p.sx} y={p.sy - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2D3580">{i + 1}</text>
        </g>
      ))}
      {/* Midpoint labels */}
      {svgPts.slice(0, -1).map((a, i) => {
        const b = svgPts[i + 1];
        const mx = (a.sx + b.sx) / 2;
        const my = (a.sy + b.sy) / 2;
        const angle = Math.atan2(b.sy - a.sy, b.sx - a.sx);
        const ox = -Math.sin(angle) * 14;
        const oy = Math.cos(angle) * 14;
        const line = lines[i];
        const deg = parseInt(line.bearingDeg) || 0;
        const min = parseInt(line.bearingMin) || 0;
        const sec = Math.round(parseFloat(line.bearingSec) || 0);
        const dist = linesToMetres(parseFloat(line.distanceRaw) || 0, line.unit);
        return (
          <g key={i}>
            <text x={mx + ox} y={my + oy - 4} textAnchor="middle" fontSize="7" fill="#2D3580" fontWeight="600">
              {fmtDMS(deg, min, sec)}
            </text>
            <text x={mx + ox} y={my + oy + 5} textAnchor="middle" fontSize="7" fill="#3A7EC4">
              {dist.toFixed(2)}m
            </text>
          </g>
        );
      })}
      {/* North arrow */}
      <g>
        <line x1={W - 18} y1={H - 18} x2={W - 18} y2={H - 36} stroke="#2D3580" strokeWidth="2" strokeLinecap="round" />
        <polygon points={`${W - 18},${H - 38} ${W - 21},${H - 30} ${W - 15},${H - 30}`} fill="#3A7EC4" />
        <text x={W - 18} y={H - 41} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2D3580">N</text>
      </g>
      <text x={svgPts[0].sx} y={svgPts[0].sy + 16} textAnchor="middle" fontSize="8" fill="#2D3580" fontWeight="700">START</text>

      {/* Shaded fill to help visualise the enclosed parcel */}
      {pts.length >= 3 && (() => {
        const closedSvgPts = [...svgPts.slice(0, -1)];
        const polyPoints = closedSvgPts.map(p => `${p.sx},${p.sy}`).join(" ");
        return <polygon points={polyPoints} fill="#2D3580" fillOpacity="0.07" stroke="none" />;
      })()}

      {/* Area label — centred inside parcel */}
      {(() => {
        const areaM2 = shoelaceM2(pts);
        if (areaM2 < 0.01) return null;
        const arp = toArpFromM2(areaM2);
        // centroid of polygon (average of interior pts)
        const interior = svgPts.slice(0, -1);
        const cx = interior.reduce((s, p) => s + p.sx, 0) / interior.length;
        const cy = interior.reduce((s, p) => s + p.sy, 0) / interior.length;
        const haStr = (areaM2 / HA_TO_M2).toFixed(4) + " ha";
        const arpStr = `${arp.acres}a ${arp.roods}r ${arp.perches}p`;
        return (
          <g>
            <rect x={cx - 38} y={cy - 14} width="76" height="28" rx="4" fill="white" fillOpacity="0.85" stroke="#2D3580" strokeWidth="0.8" />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#2D3580">{haStr}</text>
            <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7.5" fill="#3A7EC4">{arpStr}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── PDF Report generator ─────────────────────────────────────────────────────
function generateReportHTML(params: {
  planRef: string;
  dateOfSurvey: string;
  terrain: "level" | "steep";
  lines: Line[];
  rotationDD: number;
  sumDE: number;
  sumDN: number;
  misclose: number;
  perimeter: number;
  areaM2: number;
  tolerance: { formula: string; maxMetres: number };
  complies: boolean;
  yearOfSurvey: number;
  planImageUrl: string | null;
}): string {
  const { planRef, dateOfSurvey, terrain, lines, rotationDD, sumDE, sumDN, misclose, perimeter, areaM2, tolerance, complies, yearOfSurvey, planImageUrl } = params;
  const arp = toArpFromM2(areaM2);
  const statusColor = complies ? "#16a34a" : "#dc2626";
  const statusText = complies ? "COMPLIES ✓" : "DOES NOT COMPLY ✗";

  const lineRows = lines.map((l, i) => {
    const deg = parseInt(l.bearingDeg) || 0;
    const min = parseInt(l.bearingMin) || 0;
    const sec = Math.round(parseFloat(l.bearingSec) || 0);
    const rawDD = dmsToDD(deg, min, sec);
    const adjDD = (rawDD + rotationDD + 360) % 360;
    const adj = ddToDMS(adjDD);
    const distM = linesToMetres(parseFloat(l.distanceRaw) || 0, l.unit);
    const rad = adjDD * (Math.PI / 180);
    const de = distM * Math.sin(rad);
    const dn = distM * Math.cos(rad);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDMS(deg, min, sec)}</td>
        <td>${rotationDD !== 0 ? fmtDMS(adj.d, adj.m, adj.s) : "—"}</td>
        <td>${distM.toFixed(3)}</td>
        <td style="color:${de >= 0 ? "#1d4ed8" : "#c2410c"}">${(de >= 0 ? "+" : "")}${de.toFixed(4)}</td>
        <td style="color:${dn >= 0 ? "#15803d" : "#dc2626"}">${(dn >= 0 ? "+" : "")}${dn.toFixed(4)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Compiled Survey Report — ${planRef}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #2D3580; padding-bottom:12px; margin-bottom:20px; }
  .logo-block { }
  .company { font-size:18px; font-weight:800; color:#2D3580; letter-spacing:0.05em; }
  .company-sub { font-size:10px; color:#7A8290; letter-spacing:0.15em; text-transform:uppercase; }
  .report-title { font-size:13px; font-weight:700; color:#2D3580; text-align:right; }
  .report-sub { font-size:10px; color:#7A8290; text-align:right; margin-top:2px; }
  .meta { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
  .meta-item { background:#f5f6fa; border:1px solid #e0e2ef; border-radius:6px; padding:8px 12px; }
  .meta-label { font-size:9px; color:#7A8290; text-transform:uppercase; letter-spacing:0.1em; }
  .meta-value { font-size:12px; font-weight:700; color:#2D3580; margin-top:2px; }
  .section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#2D3580; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #e0e2ef; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:10px; }
  th { background:#2D3580; color:white; padding:6px 8px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.05em; }
  td { padding:5px 8px; border-bottom:1px solid #eee; font-family: 'Courier New', monospace; }
  tr:nth-child(even) td { background:#f9f9fb; }
  .result-box { border-radius:8px; padding:16px; margin-bottom:20px; border:2px solid; }
  .result-box.pass { background:#f0fdf4; border-color:#16a34a; }
  .result-box.fail { background:#fef2f2; border-color:#dc2626; }
  .result-status { font-size:18px; font-weight:900; letter-spacing:0.05em; }
  .result-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
  .result-item { background:white; border-radius:6px; padding:8px 12px; border:1px solid #e0e2ef; }
  .result-label { font-size:9px; color:#7A8290; text-transform:uppercase; letter-spacing:0.1em; }
  .result-value { font-size:13px; font-weight:700; font-family: 'Courier New', monospace; color:#2D3580; margin-top:2px; }
  .regulation { font-size:9px; color:#7A8290; margin-top:16px; line-height:1.6; padding-top:12px; border-top:1px solid #eee; }
  .footer { margin-top:32px; padding-top:12px; border-top:1px solid #e0e2ef; display:flex; justify-content:space-between; font-size:9px; color:#7A8290; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <div class="company">TREASCO</div>
    <div class="company-sub">Surveyors</div>
  </div>
  <div>
    <div class="report-title">Compiled Survey — Closure Report</div>
    <div class="report-sub">Surveying and Spatial Information Regulation 2024, s.26(3)</div>
  </div>
</div>

<div class="meta">
  <div class="meta-item">
    <div class="meta-label">Plan Reference</div>
    <div class="meta-value">${planRef || "—"}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Date of Survey</div>
    <div class="meta-value">${dateOfSurvey || "—"}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Year of Crown Survey</div>
    <div class="meta-value">${yearOfSurvey}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Terrain</div>
    <div class="meta-value">${terrain === "level" ? "Level / Undulating" : "Steep / Mountainous"}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Rotation Applied</div>
    <div class="meta-value">${rotationDD !== 0 ? fmtDMS(Math.floor(Math.abs(rotationDD)), Math.floor((Math.abs(rotationDD) % 1) * 60), Math.round(((Math.abs(rotationDD) % 1) * 60 % 1) * 60)) + (rotationDD < 0 ? " (−)" : " (+)") : "None"}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">No. of Lines</div>
    <div class="meta-value">${lines.length}</div>
  </div>
</div>

<div class="section-title">Boundary Lines</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Crown Bearing</th>
      <th>Adjusted Bearing</th>
      <th>Distance (m)</th>
      <th>ΔE (m)</th>
      <th>ΔN (m)</th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
  <tr style="font-weight:700; background:#f0f2fa;">
    <td colspan="3">TOTALS</td>
    <td>${perimeter.toFixed(3)}</td>
    <td style="color:${sumDE >= 0 ? "#1d4ed8" : "#c2410c"}">${(sumDE >= 0 ? "+" : "")}${sumDE.toFixed(4)}</td>
    <td style="color:${sumDN >= 0 ? "#15803d" : "#dc2626"}">${(sumDN >= 0 ? "+" : "")}${sumDN.toFixed(4)}</td>
  </tr>
</table>

<div class="result-box ${complies ? "pass" : "fail"}">
  <div class="result-status" style="color:${statusColor}">${statusText}</div>
  <div class="result-grid">
    <div class="result-item">
      <div class="result-label">Misclose Vector</div>
      <div class="result-value" style="color:${statusColor}">${(misclose * 1000).toFixed(1)} mm</div>
    </div>
    <div class="result-item">
      <div class="result-label">Permissible Misclose</div>
      <div class="result-value">${(tolerance.maxMetres * 1000).toFixed(1)} mm</div>
    </div>
    <div class="result-item">
      <div class="result-label">Perimeter</div>
      <div class="result-value">${perimeter.toFixed(3)} m</div>
    </div>
    <div class="result-item">
      <div class="result-label">Precision</div>
      <div class="result-value">1 : ${misclose > 0 ? Math.round(perimeter / misclose).toLocaleString() : "∞"}</div>
    </div>
    <div class="result-item">
      <div class="result-label">Misclose ΔE</div>
      <div class="result-value">${(sumDE >= 0 ? "+" : "")}${sumDE.toFixed(4)} m</div>
    </div>
    <div class="result-item">
      <div class="result-label">Misclose ΔN</div>
      <div class="result-value">${(sumDN >= 0 ? "+" : "")}${sumDN.toFixed(4)} m</div>
    </div>
  </div>
</div>

<div style="margin-bottom:20px;">
  <div class="section-title">Area Calculation (Shoelace / Coordinate Method)</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
    <div class="meta-item">
      <div class="meta-label">Square Metres</div>
      <div class="meta-value">${areaM2.toFixed(1)} m²</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Hectares</div>
      <div class="meta-value">${(areaM2 / HA_TO_M2).toFixed(4)} ha</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Acres</div>
      <div class="meta-value">${(areaM2 / ACRE_TO_M2).toFixed(4)} ac</div>
    </div>
    <div class="meta-item" style="grid-column:span 1;">
      <div class="meta-label">A – R – P</div>
      <div class="meta-value">${arp.acres}a ${arp.roods}r ${arp.perches}p</div>
    </div>
  </div>
  ${arp.remM2 > 0.01 ? `<div style="font-size:9px;color:#7A8290;margin-top:4px;">Remainder: ${arp.remM2.toFixed(2)} m²</div>` : ""}
</div>

${planImageUrl ? `
<div style="margin-bottom:20px;">
  <div class="section-title">Crown Portion Plan</div>
  <img src="${planImageUrl}" alt="Crown portion plan" style="max-width:100%;border:1px solid #e0e2ef;border-radius:6px;"/>
</div>` : ""}

<div class="regulation">
  <strong>Tolerance reference:</strong> Surveying and Spatial Information Regulation 2024 (NSW), s.26(3) — 
  For a partially compiled parcel with Crown survey year ${yearOfSurvey}, ${terrain} terrain:<br/>
  Maximum misclose vector = ${tolerance.formula} = ${(tolerance.maxMetres * 1000).toFixed(1)} mm<br/>
  Misclose vector formula: √(ΔE² + ΔN²) = ${(misclose * 1000).toFixed(1)} mm<br/><br/>
  ${complies
    ? `The misclose vector of ${(misclose * 1000).toFixed(1)} mm does not exceed the permissible tolerance of ${(tolerance.maxMetres * 1000).toFixed(1)} mm. The compiled survey complies with SSIR 2024 s.26(3).`
    : `The misclose vector of ${(misclose * 1000).toFixed(1)} mm exceeds the permissible tolerance of ${(tolerance.maxMetres * 1000).toFixed(1)} mm. In accordance with SSIR 2024 s.26(3), the surveyor must either resolve the inaccuracy by surveying additional boundaries, or provide a comprehensive report under s.76.`
  }
</div>

<div class="footer">
  <div>Treasco Surveyors · Sydney NSW · Survey COGO</div>
  <div>Generated: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</div>
</div>
</body>
</html>`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CompiledSurveyPage() {
  const { toast } = useToast();

  // Plan reference
  const [planRef, setPlanRef] = useState("");
  const [planImageUrl, setPlanImageUrl] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Survey metadata
  const [dateOfSurvey, setDateOfSurvey] = useState("");
  const [yearOfSurvey, setYearOfSurvey] = useState<number>(1900);
  const [terrain, setTerrain] = useState<"level" | "steep">("level");

  // Rotation
  const [rotDeg, setRotDeg] = useState("");
  const [rotMin, setRotMin] = useState("");
  const [rotSec, setRotSec] = useState("");
  const [rotSign, setRotSign] = useState<"+" | "-">("+");

  // Lines
  const [lines, setLines] = useState<Line[]>([newLine()]);

  // Active tab
  const [activeTab, setActiveTab] = useState<"lines" | "diagram" | "results">("lines");

  // ── Upload handler ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ title: "Please upload an image (JPG/PNG) or PDF", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setPlanImageUrl(url);
    setShowPlan(true);
    toast({ title: "Plan uploaded — tap 'View Plan' to display" });
  }

  // ── Date handler — extract year from date ────────────────────────────────
  function handleDateChange(val: string) {
    setDateOfSurvey(val);
    const yr = parseInt(val.slice(0, 4));
    if (yr >= 1788 && yr <= new Date().getFullYear()) setYearOfSurvey(yr);
  }

  // ── Rotation ─────────────────────────────────────────────────────────────
  const rotationDD = (() => {
    const d = parseInt(rotDeg) || 0;
    const m = parseInt(rotMin) || 0;
    const s = Math.round(parseFloat(rotSec) || 0);
    const dd = dmsToDD(d, m, s);
    return rotSign === "+" ? dd : -dd;
  })();

  // ── Line CRUD ─────────────────────────────────────────────────────────────
  function addLine() {
    setLines(ls => [...ls, { ...newLine(), id: Date.now() }]);
  }

  function updateLine(id: number, updated: Line) {
    setLines(ls => ls.map(l => l.id === id ? updated : l));
  }

  function deleteLine(id: number) {
    setLines(ls => ls.filter(l => l.id !== id));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setLines(ls => { const a = [...ls]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  }

  function moveDown(i: number) {
    if (i === lines.length - 1) return;
    setLines(ls => { const a = [...ls]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; });
  }

  // ── Compute ───────────────────────────────────────────────────────────────
  const { sumDE, sumDN, misclose, perimeter, areaM2 } = (() => {
    let de = 0, dn = 0, peri = 0;
    const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    for (const l of lines) {
      const deg = parseInt(l.bearingDeg) || 0;
      const min = parseInt(l.bearingMin) || 0;
      const sec = Math.round(parseFloat(l.bearingSec) || 0);
      const rawDD = dmsToDD(deg, min, sec);
      const adjDD = (rawDD + rotationDD + 360) % 360;
      const rad = adjDD * (Math.PI / 180);
      const distM = linesToMetres(parseFloat(l.distanceRaw) || 0, l.unit);
      de += distM * Math.sin(rad);
      dn += distM * Math.cos(rad);
      peri += distM;
      pts.push({ x: pts[pts.length-1].x + distM * Math.sin(rad), y: pts[pts.length-1].y + distM * Math.cos(rad) });
    }
    const mc = Math.sqrt(de * de + dn * dn);
    return { sumDE: de, sumDN: dn, misclose: mc, perimeter: peri, areaM2: shoelaceM2(pts) };
  })();

  const tolerance = compiledTolerance(yearOfSurvey, terrain, perimeter);
  const complies = misclose <= tolerance.maxMetres;
  const hasResults = lines.length >= 2 && perimeter > 0;

  // ── PDF export ────────────────────────────────────────────────────────────
  function exportPDF() {
    if (!hasResults) {
      toast({ title: "Add at least 2 lines first", variant: "destructive" });
      return;
    }
    const html = generateReportHTML({
      planRef, dateOfSurvey, terrain, lines, rotationDD,
      sumDE, sumDN, misclose, perimeter, areaM2, tolerance, complies, yearOfSurvey,
      planImageUrl,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compiled-survey-${planRef || "report"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded — open in browser and print to PDF" });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-4 pb-28">

      {/* Plan upload card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#2D3580" }}>
              <Upload size={13} color="white" />
            </div>
            Crown Plan Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={planRef}
              onChange={e => setPlanRef(e.target.value)}
              placeholder="Plan reference (e.g. DP 123456)"
              className="flex-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={13} /> Upload Plan Image
            </Button>
            {planImageUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowPlan(s => !s)}
              >
                <FileText size={13} /> {showPlan ? "Hide Plan" : "View Plan"}
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
          {showPlan && planImageUrl && (
            <div className="border border-border rounded-xl overflow-hidden">
              <img src={planImageUrl} alt="Crown plan" className="w-full h-auto max-h-72 object-contain bg-muted" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey metadata card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#2D3580" }}>
              <FileText size={13} color="white" />
            </div>
            Survey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Date of survey */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Date of Crown Survey <span className="text-primary">(determines tolerance)</span>
            </label>
            <Input
              type="date"
              value={dateOfSurvey}
              onChange={e => handleDateChange(e.target.value)}
              className="text-sm"
            />
            {yearOfSurvey > 1788 && (
              <div className="text-xs text-muted-foreground">
                Year: <span className="font-semibold text-foreground">{yearOfSurvey}</span>
                {" "}→ Tolerance: <span className="font-semibold text-primary">{tolerance.formula}</span>
              </div>
            )}
          </div>

          {/* Terrain */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Terrain</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setTerrain("level")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${terrain === "level" ? "text-primary-foreground" : "bg-background text-muted-foreground"}`}
                style={terrain === "level" ? { background: "#2D3580" } : {}}
              >
                Level / Undulating
              </button>
              <button
                onClick={() => setTerrain("steep")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${terrain === "steep" ? "text-primary-foreground" : "bg-background text-muted-foreground"}`}
                style={terrain === "steep" ? { background: "#2D3580" } : {}}
              >
                Steep / Mountainous
              </button>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1 block">
              <RotateCw size={11} /> Bearing Rotation (Crown → MGA)
            </label>
            <div className="flex gap-1 items-end">
              {/* Sign */}
              <div className="flex rounded overflow-hidden border border-border shrink-0">
                <button
                  className={`px-2.5 py-2 text-xs font-bold transition-colors ${rotSign === "+" ? "text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  style={rotSign === "+" ? { background: "#2D3580" } : {}}
                  onClick={() => setRotSign("+")}
                >+</button>
                <button
                  className={`px-2.5 py-2 text-xs font-bold transition-colors ${rotSign === "-" ? "text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  style={rotSign === "-" ? { background: "#2D3580" } : {}}
                  onClick={() => setRotSign("-")}
                >−</button>
              </div>
              <TinyInput label="DEG" value={rotDeg} onChange={setRotDeg} placeholder="0" max={359} />
              <TinyInput label="MIN" value={rotMin} onChange={setRotMin} placeholder="00" max={59} />
              <TinyInput label="SEC" value={rotSec} onChange={setRotSec} placeholder="00" max={59} />
            </div>
            {rotationDD !== 0 && (
              <div className="text-xs text-primary font-semibold mt-1">
                Rotation: {rotSign}{Math.abs(rotationDD).toFixed(6)}° applied to all bearings
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Boundary lines card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#2D3580" }}>
              <Navigation size={13} color="white" />
            </div>
            Crown Boundary Lines
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
            {(["lines", "diagram", "results"] as const).map(t => (
              <button
                key={t}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium capitalize transition-all ${activeTab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                onClick={() => setActiveTab(t)}
              >
                {t === "results" ? "Results" : t === "diagram" ? "Diagram" : "Lines"}
              </button>
            ))}
          </div>

          {activeTab === "lines" && (
            <div className="space-y-2">
              {/* Units hint */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <Ruler size={11} />
                <span>Toggle <strong>m / lk</strong> per line. Conversion shown below each entry.</span>
              </div>
              {lines.map((l, i) => (
                <LineRow
                  key={l.id}
                  line={l}
                  index={i}
                  total={lines.length}
                  rotationDD={rotationDD}
                  onChange={updated => updateLine(l.id, updated)}
                  onDelete={() => deleteLine(l.id)}
                  onMoveUp={() => moveUp(i)}
                  onMoveDown={() => moveDown(i)}
                />
              ))}
              <Button onClick={addLine} variant="outline" size="sm" className="w-full gap-1.5 mt-1">
                <Plus size={14} /> Add Line
              </Button>
            </div>
          )}

          {activeTab === "diagram" && (
            <div>
              {lines.length < 2 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Info size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Add at least 2 lines to see the diagram.</p>
                </div>
              ) : (
                <div className="bg-muted/20 border border-border rounded-xl p-2">
                  <CompiledDiagram lines={lines} rotationDD={rotationDD} />
                  <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground px-1">
                    <div className="flex items-center gap-1.5">
                      <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#2D3580" strokeWidth="2"/></svg>
                      Boundary lines
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2"/></svg>
                      Misclose
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-3">
              {!hasResults ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Add at least 2 lines with distances to compute.</p>
                </div>
              ) : (
                <>
                  {/* Compliance banner */}
                  <div
                    className="rounded-xl p-4 border-2"
                    style={{
                      background: complies ? "#f0fdf4" : "#fef2f2",
                      borderColor: complies ? "#16a34a" : "#dc2626",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {complies
                        ? <CheckCircle2 size={28} color="#16a34a" />
                        : <XCircle size={28} color="#dc2626" />
                      }
                      <div>
                        <div className="font-bold text-base" style={{ color: complies ? "#16a34a" : "#dc2626" }}>
                          {complies ? "COMPLIES" : "DOES NOT COMPLY"}
                        </div>
                        <div className="text-xs text-muted-foreground">SSIR 2024 s.26(3) — compiled survey tolerance</div>
                      </div>
                    </div>
                  </div>

                  {/* Key metrics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Misclose Vector</div>
                      <div className="font-mono font-bold text-sm" style={{ color: complies ? "#16a34a" : "#dc2626" }}>
                        {(misclose * 1000).toFixed(1)} mm
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Permissible</div>
                      <div className="font-mono font-bold text-sm text-foreground">
                        {(tolerance.maxMetres * 1000).toFixed(1)} mm
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Perimeter</div>
                      <div className="font-mono text-sm font-semibold">{perimeter.toFixed(3)} m</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Precision</div>
                      <div className="font-mono text-sm font-semibold">
                        1 : {misclose > 0 ? Math.round(perimeter / misclose).toLocaleString() : "∞"}
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ΣΔE</div>
                      <div className={`font-mono text-sm font-semibold ${sumDE >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                        {(sumDE >= 0 ? "+" : "")}{sumDE.toFixed(4)} m
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ΣΔN</div>
                      <div className={`font-mono text-sm font-semibold ${sumDN >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(sumDN >= 0 ? "+" : "")}{sumDN.toFixed(4)} m
                      </div>
                    </div>
                  </div>

                  {/* Area calculation */}
                  {(() => {
                    const arp = toArpFromM2(areaM2);
                    return (
                      <div className="bg-card border-2 border-primary/30 rounded-xl p-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Parcel Area</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Hectares</div>
                            <div className="font-mono font-bold text-foreground">{(areaM2 / HA_TO_M2).toFixed(4)} ha</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">m²</div>
                            <div className="font-mono font-bold text-foreground">{areaM2.toFixed(1)} m²</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Acres</div>
                            <div className="font-mono font-bold text-foreground">{(areaM2 / ACRE_TO_M2).toFixed(4)} ac</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">A – R – P</div>
                            <div className="font-mono font-bold text-foreground">{arp.acres}a {arp.roods}r {arp.perches}p</div>
                          </div>
                        </div>
                        {arp.remM2 > 0.01 && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">+ {arp.remM2.toFixed(2)} m² remainder</div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1.5">Computed via coordinate (Shoelace) method</div>
                      </div>
                    );
                  })()}

                  {/* Tolerance formula */}
                  <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Info size={11} /> Tolerance — SSIR 2024 s.26(3)
                    </p>
                    <p>Year of Crown survey: <strong>{yearOfSurvey}</strong></p>
                    <p>Terrain: <strong>{terrain === "level" ? "Level / Undulating" : "Steep / Mountainous"}</strong></p>
                    <p>Formula: <strong>{tolerance.formula}</strong></p>
                    <p>= <strong>{(tolerance.maxMetres * 1000).toFixed(1)} mm</strong> for this perimeter ({perimeter.toFixed(1)} m)</p>
                    {!complies && (
                      <p className="mt-2 text-red-700 font-semibold">
                        Exceeds tolerance by {((misclose - tolerance.maxMetres) * 1000).toFixed(1)} mm. Survey additional boundaries or provide a comprehensive report under s.76.
                      </p>
                    )}
                  </div>

                  {/* Export button */}
                  <Button onClick={exportPDF} className="w-full gap-2" style={{ background: "#2D3580" }}>
                    <Download size={15} /> Export Report (HTML → Print to PDF)
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick reference */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-1"><AlertTriangle size={11} /> SSIR 2024 s.26(3) — Compiled Survey Tolerance</p>
        <table className="w-full text-[10px] mt-1">
          <thead><tr className="text-left">
            <th className="pb-1 font-semibold text-foreground">Year of Crown Survey</th>
            <th className="pb-1 font-semibold text-foreground">Level / Undulating</th>
            <th className="pb-1 font-semibold text-foreground">Steep / Mountain</th>
          </tr></thead>
          <tbody>
            <tr><td>1788 – 1862</td><td>1,000 ppm</td><td>2,000 ppm</td></tr>
            <tr><td>1862 – 1975</td><td>500 ppm</td><td>1,320 ppm</td></tr>
            <tr><td>1975 – 2001</td><td>500 ppm</td><td>1,000 ppm</td></tr>
            <tr><td>2001 – present</td><td colSpan={2}>60 mm + 400 ppm</td></tr>
          </tbody>
        </table>
        <p className="mt-1">Source: <em>Surveying and Spatial Information Regulation 2024</em> (NSW), s.26(3).</p>
      </div>
    </div>
  );
}
