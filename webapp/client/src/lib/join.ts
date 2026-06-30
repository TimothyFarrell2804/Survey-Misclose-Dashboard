import type { JoinPoint } from "@shared/schema";
import { toDeg, toRad } from "./traverse";

export interface JoinResult {
  fromLabel: string;
  toLabel: string;
  fromIdx: number;
  toIdx: number;
  gridBearing: number;       // decimal degrees WCB 0-360
  gridBearingStr: string;    // DMS formatted
  gridDistance: number;      // metres
  groundDistance: number;    // metres (grid / scaleFactor)
  deltaE: number;
  deltaN: number;
}

/**
 * Compute bearing (WCB) between two points in decimal degrees.
 */
export function bearing(fromE: number, fromN: number, toE: number, toN: number): number {
  const dE = toE - fromE;
  const dN = toN - fromN;
  let b = toDeg(Math.atan2(dE, dN));
  return ((b % 360) + 360) % 360;
}

/**
 * Format decimal degrees as DMS string.
 */
export function ddToDMS(dd: number): string {
  const norm = ((dd % 360) + 360) % 360;
  const d = Math.floor(norm);
  const mf = (norm - d) * 60;
  let m = Math.floor(mf);
  let s = Math.round((mf - m) * 60);
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; }
  return `${String(d).padStart(3, "0")}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

/**
 * Compute all sequential joins (each point → next point) for a list of points.
 * scaleFactor: grid distance = ground distance * scaleFactor
 *   → ground distance = grid distance / scaleFactor
 * Pass scaleFactor=1 for no scale correction.
 */
export function computeJoins(points: JoinPoint[], scaleFactor: number): JoinResult[] {
  if (points.length < 2) return [];
  const sf = scaleFactor > 0 ? scaleFactor : 1;

  const results: JoinResult[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i];
    const B = points[i + 1];
    const dE = B.easting - A.easting;
    const dN = B.northing - A.northing;
    const gridDist = Math.sqrt(dE * dE + dN * dN);
    const groundDist = gridDist / sf;
    const bear = bearing(A.easting, A.northing, B.easting, B.northing);

    results.push({
      fromLabel: A.label || `Pt ${i + 1}`,
      toLabel: B.label || `Pt ${i + 2}`,
      fromIdx: i,
      toIdx: i + 1,
      gridBearing: bear,
      gridBearingStr: ddToDMS(bear),
      gridDistance: gridDist,
      groundDistance: groundDist,
      deltaE: dE,
      deltaN: dN,
    });
  }
  return results;
}

// ─── SVG layout helpers ────────────────────────────────────────────────────

export interface CanvasPoint {
  x: number;
  y: number;
  label: string;
  easting: number;
  northing: number;
}

const PAD = 56; // px padding inside SVG

/**
 * Map survey coordinates to SVG canvas coordinates.
 * SVG Y is inverted (north = up = smaller Y).
 */
export function toCanvasPoints(
  points: JoinPoint[],
  svgW: number,
  svgH: number
): CanvasPoint[] {
  if (points.length === 0) return [];

  const eastings = points.map((p) => p.easting);
  const northings = points.map((p) => p.northing);
  const minE = Math.min(...eastings);
  const maxE = Math.max(...eastings);
  const minN = Math.min(...northings);
  const maxN = Math.max(...northings);

  const rangeE = maxE - minE || 1;
  const rangeN = maxN - minN || 1;

  const usableW = svgW - PAD * 2;
  const usableH = svgH - PAD * 2;

  // Maintain aspect ratio
  const scaleE = usableW / rangeE;
  const scaleN = usableH / rangeN;
  const scale = Math.min(scaleE, scaleN);

  // Centre in canvas
  const offsetX = PAD + (usableW - rangeE * scale) / 2;
  const offsetY = PAD + (usableH - rangeN * scale) / 2;

  return points.map((p, i) => ({
    x: offsetX + (p.easting - minE) * scale,
    // Y is inverted: higher northing → smaller y
    y: svgH - (offsetY + (p.northing - minN) * scale),
    label: p.label || `Pt ${i + 1}`,
    easting: p.easting,
    northing: p.northing,
  }));
}

/**
 * Midpoint between two canvas points, offset perpendicular to line.
 * Used for label placement.
 */
export function labelOffset(
  x1: number, y1: number,
  x2: number, y2: number,
  offset = 14
): { x: number; y: number; angle: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector (rotated 90° clockwise)
  const px = -dy / len;
  const py = dx / len;
  // Angle of the line for text rotation (keep text readable)
  let angle = toDeg(Math.atan2(dy, dx));
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return {
    x: mx + px * offset,
    y: my + py * offset,
    angle,
  };
}

/**
 * Format a distance for diagram label.
 */
export function fmtDist(d: number): string {
  if (d >= 1000) return `${(d / 1000).toFixed(3)} km`;
  return `${d.toFixed(3)} m`;
}
