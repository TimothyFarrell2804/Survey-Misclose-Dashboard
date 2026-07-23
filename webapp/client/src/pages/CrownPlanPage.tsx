import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Download, ArrowRight, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Confidence = "green" | "orange" | "red";

interface FieldResult {
  value: string | null;
  confidence: Confidence;
  note?: string;
  unit?: string;
}

interface BearingResult extends FieldResult {}
interface DistanceResult extends FieldResult {}

interface BoundaryLine {
  lineNumber: number;
  bearing: BearingResult;
  distance: DistanceResult;
  adjoiningInfo?: string;
}

interface PlanData {
  planReference: FieldResult;
  surveyorName: FieldResult;
  surveyDate: FieldResult;
  parish: FieldResult;
  county: FieldResult;
  lotNumber: FieldResult;
  titleArea: FieldResult;
  boundaryLines: BoundaryLine[];
  adjoiningParcels: { label: string; confidence: Confidence }[];
  generalNotes: string;
  overallReadability: Confidence;
}

// ── Confidence helpers ────────────────────────────────────────────────────────
const confColor: Record<Confidence, string> = {
  green: "#16a34a",
  orange: "#ea580c",
  red: "#dc2626",
};
const confBg: Record<Confidence, string> = {
  green: "#f0fdf4",
  orange: "#fff7ed",
  red: "#fef2f2",
};
const confBorder: Record<Confidence, string> = {
  green: "#bbf7d0",
  orange: "#fed7aa",
  red: "#fecaca",
};

function ConfBadge({ c }: { c: Confidence }) {
  const icons = { green: CheckCircle2, orange: AlertTriangle, red: XCircle };
  const labels = { green: "Accurate", orange: "Suspect", red: "Not Readable" };
  const Icon = icons[c];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: confColor[c], background: confBg[c], border: `1px solid ${confBorder[c]}` }}
    >
      <Icon size={11} />
      {labels[c]}
    </span>
  );
}

function FieldRow({ label, field }: { label: string; field: FieldResult }) {
  if (!field) return null;
  return (
    <tr style={{ borderBottom: "1px solid #e0e2ef" }}>
      <td style={{ padding: "7px 10px", fontWeight: 600, color: "#2D3580", width: "35%", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 13, color: field.value ? "#1e293b" : "#94a3b8" }}>
        {field.value ?? "—"}
        {field.unit ? <span style={{ color: "#64748b", marginLeft: 4 }}>({field.unit})</span> : null}
      </td>
      <td style={{ padding: "7px 10px", textAlign: "center" }}>
        <ConfBadge c={field.confidence} />
      </td>
      <td style={{ padding: "7px 10px", color: "#64748b", fontSize: 11 }}>{field.note ?? ""}</td>
    </tr>
  );
}

// ── Convert links distance to metres for pre-fill ─────────────────────────────
const LINK_TO_METRE = 0.201168;
const CHAIN_TO_METRE = 20.1168;
const FOOT_TO_METRE = 0.3048;

function distToMetres(value: string, unit?: string): { raw: string; unit: "metres" | "links" } {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return { raw: value, unit: "metres" };
  const u = (unit ?? "").toLowerCase();
  if (u.includes("link")) return { raw: String(num), unit: "links" };
  if (u.includes("chain")) return { raw: (num * CHAIN_TO_METRE).toFixed(3), unit: "metres" };
  if (u.includes("foot") || u.includes("feet") || u.includes("ft")) return { raw: (num * FOOT_TO_METRE).toFixed(3), unit: "metres" };
  return { raw: String(num), unit: "metres" };
}

function parseBearingDMS(bearing: string): { deg: string; min: string; sec: string } | null {
  const m = bearing.match(/(\d+)[°\s]+(\d+)['\s]+(\d+)/);
  if (!m) return null;
  return { deg: m[1], min: m[2], sec: m[3] };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CrownPlanPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const interpret = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("plan", file);
      const resp = await fetch("/api/interpret-plan", { method: "POST", body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Server error");
      setResult(json.data as PlanData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast({ title: "Interpretation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const prefillCompiled = () => {
    if (!result) return;
    const lines = (result.boundaryLines ?? [])
      .filter(l => l.bearing?.value && l.distance?.value)
      .map((l, i) => {
        const dms = parseBearingDMS(l.bearing.value!);
        const dist = distToMetres(l.distance.value!, l.distance.unit);
        return {
          id: Date.now() + i,
          bearingDeg: dms?.deg ?? "",
          bearingMin: dms?.min ?? "",
          bearingSec: dms?.sec ?? "",
          distanceRaw: dist.raw,
          unit: dist.unit,
        };
      });
    if (lines.length === 0) {
      toast({ title: "No boundary lines to pre-fill", description: "No parseable bearings/distances were found.", variant: "destructive" });
      return;
    }
    localStorage.setItem("compiledLines", JSON.stringify(lines));
    if (result.planReference?.value) {
      localStorage.setItem("compiledPlanRef", result.planReference.value);
    }
    toast({ title: `Pre-filled ${lines.length} boundary lines`, description: "Switch to the Compiled tab to review." });
  };

  const exportReport = () => {
    if (!result) return;
    const html = buildReportHTML(result, file?.name ?? "Plan", preview);
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const confSummary = (data: PlanData) => {
    const all: Confidence[] = [
      data.planReference?.confidence, data.surveyorName?.confidence, data.surveyDate?.confidence,
      data.parish?.confidence, data.county?.confidence, data.lotNumber?.confidence, data.titleArea?.confidence,
      ...(data.boundaryLines ?? []).flatMap(l => [l.bearing?.confidence, l.distance?.confidence]),
    ].filter(Boolean) as Confidence[];
    const green = all.filter(c => c === "green").length;
    const orange = all.filter(c => c === "orange").length;
    const red = all.filter(c => c === "red").length;
    return { green, orange, red, total: all.length };
  };

  return (
    <div className="flex flex-col gap-4 p-3 pb-24">
      {/* Header note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              AI plan reading requires a live server — it works in the <strong>preview</strong> and on <strong>Digital Ocean</strong>.
              PDF plans are converted automatically (first page only). For multi-page plans, upload each page separately.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload zone */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
            <Upload size={16} /> Upload Crown Portion Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 flex flex-col gap-3">
          <div
            className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            style={{
              borderColor: dragging ? "#2D3580" : "#c7cde8",
              background: dragging ? "#eef0fb" : "#f8f9ff",
              minHeight: 120,
              padding: 16,
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText size={32} style={{ color: "#2D3580", opacity: 0.6 }} />
            {file ? (
              <div className="text-center">
                <div className="font-semibold text-primary text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <>
                <div className="font-semibold text-primary text-sm">Drag & drop plan here</div>
                <div className="text-xs text-muted-foreground">or tap to browse — JPG, PNG or PDF (scanned plans)</div>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onInputChange} />
          </div>

          {preview && (
            <img src={preview} alt="Plan preview" className="rounded-lg border w-full object-contain" style={{ maxHeight: 220 }} />
          )}

          <Button
            className="w-full font-bold"
            style={{ background: "#2D3580" }}
            disabled={!file || loading}
            onClick={interpret}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin mr-2" /> Interpreting plan…</>
            ) : (
              "Interpret Crown Plan"
            )}
          </Button>

          {loading && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              Reading bearings, distances and title block… this takes 10–20 seconds
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (() => {
        const { green, orange, red, total } = confSummary(result);
        return (
          <>
            {/* Summary bar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-primary">Interpretation Complete</div>
                  <ConfBadge c={result.overallReadability} />
                </div>
                <div className="flex gap-3 text-xs mb-3">
                  <span style={{ color: confColor.green }} className="font-semibold flex items-center gap-1"><CheckCircle2 size={12} />{green} accurate</span>
                  <span style={{ color: confColor.orange }} className="font-semibold flex items-center gap-1"><AlertTriangle size={12} />{orange} suspect</span>
                  <span style={{ color: confColor.red }} className="font-semibold flex items-center gap-1"><XCircle size={12} />{red} unreadable</span>
                  <span className="text-muted-foreground">/ {total} fields</span>
                </div>
                {/* Readability bar */}
                <div className="h-2 rounded-full flex overflow-hidden" style={{ background: "#e2e8f0" }}>
                  {green > 0 && <div style={{ flex: green, background: "#16a34a" }} />}
                  {orange > 0 && <div style={{ flex: orange, background: "#ea580c" }} />}
                  {red > 0 && <div style={{ flex: red, background: "#dc2626" }} />}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 text-xs font-bold" style={{ background: "#2D3580" }} onClick={prefillCompiled}>
                    <ArrowRight size={13} className="mr-1" /> Pre-fill Compiled Tab
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={exportReport}>
                    <Download size={13} className="mr-1" /> Export PDF Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Title block */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Title Block</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="overflow-x-auto">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <tbody>
                      <FieldRow label="Plan Reference" field={result.planReference} />
                      <FieldRow label="Surveyor" field={result.surveyorName} />
                      <FieldRow label="Date of Survey" field={result.surveyDate} />
                      <FieldRow label="Parish" field={result.parish} />
                      <FieldRow label="County" field={result.county} />
                      <FieldRow label="Lot / Portion" field={result.lotNumber} />
                      <FieldRow label="Title Area" field={result.titleArea} />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Boundary lines */}
            {(result.boundaryLines ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">
                    Crown Boundary Lines ({result.boundaryLines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex flex-col gap-2">
                    {result.boundaryLines.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-2"
                        style={{ borderColor: "#e0e2ef", background: i % 2 === 0 ? "#f8f9ff" : "white" }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-primary">Line {line.lineNumber ?? i + 1}</div>
                          {line.adjoiningInfo && (
                            <div className="text-xs text-muted-foreground">{line.adjoiningInfo}</div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Bearing</div>
                            <div className="font-mono text-sm font-semibold" style={{ color: line.bearing?.confidence ? confColor[line.bearing.confidence] : "#1e293b" }}>
                              {line.bearing?.value ?? "—"}
                            </div>
                            {line.bearing && <ConfBadge c={line.bearing.confidence} />}
                            {line.bearing?.note && <div className="text-xs text-muted-foreground mt-0.5">{line.bearing.note}</div>}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Distance</div>
                            <div className="font-mono text-sm font-semibold" style={{ color: line.distance?.confidence ? confColor[line.distance.confidence] : "#1e293b" }}>
                              {line.distance?.value ?? "—"} {line.distance?.unit ? `(${line.distance.unit})` : ""}
                            </div>
                            {line.distance && <ConfBadge c={line.distance.confidence} />}
                            {line.distance?.note && <div className="text-xs text-muted-foreground mt-0.5">{line.distance.note}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adjoining parcels */}
            {(result.adjoiningParcels ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Adjoining Parcels</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {result.adjoiningParcels.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded text-xs font-mono font-semibold"
                        style={{ background: confBg[p.confidence], color: confColor[p.confidence], border: `1px solid ${confBorder[p.confidence]}` }}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General notes */}
            {result.generalNotes && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">General Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.generalNotes}</p>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}
    </div>
  );
}

// ── PDF report builder ────────────────────────────────────────────────────────
function buildReportHTML(data: PlanData, filename: string, planImage: string | null): string {
  const confLabel: Record<Confidence, string> = { green: "Accurate", orange: "Suspect", red: "Not Readable" };
  const confHex: Record<Confidence, string> = { green: "#16a34a", orange: "#ea580c", red: "#dc2626" };
  const confBgHex: Record<Confidence, string> = { green: "#f0fdf4", orange: "#fff7ed", red: "#fef2f2" };

  const fieldRow = (label: string, field: FieldResult | undefined) => {
    if (!field) return "";
    return `<tr>
      <td style="padding:7px 10px;font-weight:600;color:#2D3580;width:30%;">${label}</td>
      <td style="padding:7px 10px;font-family:monospace;">${field.value ?? "—"}${field.unit ? ` <span style="color:#64748b">(${field.unit})</span>` : ""}</td>
      <td style="padding:7px 10px;text-align:center;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${confBgHex[field.confidence]};color:${confHex[field.confidence]}">${confLabel[field.confidence]}</span></td>
      <td style="padding:7px 10px;font-size:11px;color:#64748b;">${field.note ?? ""}</td>
    </tr>`;
  };

  const boundaryRows = (data.boundaryLines ?? []).map(l => `<tr>
    <td style="padding:6px 10px;font-weight:600;color:#2D3580;">Line ${l.lineNumber}</td>
    <td style="padding:6px 10px;font-family:monospace;"><span style="color:${confHex[l.bearing?.confidence ?? "red"]}">${l.bearing?.value ?? "—"}</span>
      <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;background:${confBgHex[l.bearing?.confidence ?? "red"]};color:${confHex[l.bearing?.confidence ?? "red"]}">${confLabel[l.bearing?.confidence ?? "red"]}</span>
    </td>
    <td style="padding:6px 10px;font-family:monospace;"><span style="color:${confHex[l.distance?.confidence ?? "red"]}">${l.distance?.value ?? "—"} ${l.distance?.unit ? `(${l.distance.unit})` : ""}</span>
      <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;background:${confBgHex[l.distance?.confidence ?? "red"]};color:${confHex[l.distance?.confidence ?? "red"]}">${confLabel[l.distance?.confidence ?? "red"]}</span>
    </td>
    <td style="padding:6px 10px;font-size:11px;color:#64748b;">${l.adjoiningInfo ?? ""}</td>
  </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Crown Plan Interpretation Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { background: #f0f2fa; padding: 20px; }
  .page { background: white; max-width: 900px; margin: 0 auto; padding: 36px 40px; border-radius: 12px; box-shadow: 0 2px 16px rgba(45,53,128,0.1); }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2D3580; padding-bottom: 16px; margin-bottom: 24px; }
  .logo-block { display: flex; flex-direction: column; gap: 2px; }
  .logo-block .company { font-size: 18px; font-weight: 800; color: #2D3580; }
  .logo-block .sub { font-size: 11px; color: #7A8290; }
  .report-title { text-align: right; }
  .report-title h1 { font-size: 20px; font-weight: 800; color: #2D3580; }
  .report-title p { font-size: 11px; color: #7A8290; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2D3580; border-left: 4px solid #3A7EC4; padding-left: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #2D3580; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  tr { border-bottom: 1px solid #e0e2ef; }
  tr:last-child { border-bottom: none; }
  .overall-box { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; }
  .legend { display: flex; gap: 16px; margin-bottom: 12px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  @media print { body { background: white; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <div class="company">TREASCO SURVEYORS</div>
      <div class="sub">Crown Portion Plan Interpretation Report</div>
    </div>
    <div class="report-title">
      <h1>Plan Interpretation</h1>
      <p>File: ${filename}</p>
      <p>Generated: ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Overall Readability</div>
    <div class="legend">
      <div class="legend-item"><div class="dot" style="background:#16a34a"></div> Green = Accurate / clearly legible</div>
      <div class="legend-item"><div class="dot" style="background:#ea580c"></div> Orange = Suspect / partially legible</div>
      <div class="legend-item"><div class="dot" style="background:#dc2626"></div> Red = Not readable</div>
    </div>
    <div class="overall-box" style="background:${confBgHex[data.overallReadability]};color:${confHex[data.overallReadability]};border:2px solid ${confHex[data.overallReadability]}">
      Overall: ${confLabel[data.overallReadability]}
    </div>
    ${data.generalNotes ? `<p style="margin-top:12px;font-size:12px;color:#475569;line-height:1.6">${data.generalNotes}</p>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Title Block</div>
    <table>
      <thead><tr><th>Field</th><th>Extracted Value</th><th>Confidence</th><th>Notes</th></tr></thead>
      <tbody>
        ${fieldRow("Plan Reference", data.planReference)}
        ${fieldRow("Surveyor", data.surveyorName)}
        ${fieldRow("Date of Survey", data.surveyDate)}
        ${fieldRow("Parish", data.parish)}
        ${fieldRow("County", data.county)}
        ${fieldRow("Lot / Portion", data.lotNumber)}
        ${fieldRow("Title Area", data.titleArea)}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Crown Boundary Lines</div>
    <table>
      <thead><tr><th>Line</th><th>Bearing</th><th>Distance</th><th>Adjoining</th></tr></thead>
      <tbody>${boundaryRows}</tbody>
    </table>
  </div>

  ${(data.adjoiningParcels ?? []).length > 0 ? `
  <div class="section">
    <div class="section-title">Adjoining Parcels</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${data.adjoiningParcels.map(p => `<span style="padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;font-family:monospace;background:${confBgHex[p.confidence]};color:${confHex[p.confidence]}">${p.label}</span>`).join("")}
    </div>
  </div>` : ""}

  ${planImage ? `
  <div class="section">
    <div class="section-title">Uploaded Plan Image</div>
    <img src="${planImage}" style="max-width:100%;border:1px solid #e0e2ef;border-radius:8px;" alt="Crown portion plan"/>
  </div>` : ""}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e2ef;font-size:10px;color:#94a3b8;text-align:center;">
    Treasco Surveyors &bull; Crown Plan Interpretation &bull; ${new Date().toLocaleDateString("en-AU")} &bull;
    Confidence ratings are AI-generated and should be independently verified before use in surveys.
  </div>
</div>
</body>
</html>`;
}
