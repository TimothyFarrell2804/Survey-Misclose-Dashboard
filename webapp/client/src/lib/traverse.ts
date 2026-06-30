import type { Leg } from "@shared/schema";

/**
 * Convert DMS bearing to decimal degrees
 */
export function dmsToDecimal(deg: number, min: number, sec: number): number {
  return deg + min / 60 + sec / 3600;
}

/**
 * Convert decimal degrees to radians
 */
export function toRad(dd: number): number {
  return (dd * Math.PI) / 180;
}

/**
 * Convert radians to decimal degrees
 */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Format decimal degrees to DMS string
 */
export function decimalToDMS(dd: number): string {
  const d = Math.floor(dd);
  const mf = (dd - d) * 60;
  let m = Math.floor(mf);
  let s = Math.round((mf - m) * 60);
  // handle carry-over when seconds round up to 60
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; }
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

/**
 * Format a whole-circle bearing (0-360) as DMS
 */
export function bearingToDMS(bearingDD: number): string {
  const norm = ((bearingDD % 360) + 360) % 360;
  return decimalToDMS(norm);
}

/**
 * Compute traverse misclose and precision
 */
export interface TraverseResult {
  // Raw coordinate sums
  sumEasting: number;   // ΣΔE
  sumNorthing: number;  // ΣΔN
  // Misclose vector
  miscloseDist: number;  // linear misclose (m)
  miscloseDir: number;   // bearing of misclose vector (decimal degrees)
  miscloseDistStr: string;
  // (duplicate removed)
  miscloseDirectionStr: string;
  // Precision
  totalDist: number;
  precision: number;     // 1:X ratio
  precisionStr: string;
  // Individual coordinate differences
  coords: { easting: number; northing: number; bearingDD: number }[];
  // Quality rating
  quality: "excellent" | "good" | "fair" | "poor";
}

export function computeTraverse(legs: Leg[]): TraverseResult | null {
  if (legs.length < 2) return null;

  const coords: { easting: number; northing: number; bearingDD: number }[] = [];
  let sumE = 0;
  let sumN = 0;
  let totalDist = 0;

  for (const leg of legs) {
    const bearingDD = dmsToDecimal(leg.bearingDeg, leg.bearingMin, leg.bearingSec);
    const rad = toRad(bearingDD);
    const dE = leg.distance * Math.sin(rad);
    const dN = leg.distance * Math.cos(rad);
    coords.push({ easting: dE, northing: dN, bearingDD });
    sumE += dE;
    sumN += dN;
    totalDist += leg.distance;
  }

  const miscloseDist = Math.sqrt(sumE * sumE + sumN * sumN);
  // bearing of misclose vector
  let miscloseDir = toDeg(Math.atan2(sumE, sumN));
  miscloseDir = ((miscloseDir % 360) + 360) % 360;

  const precision = miscloseDist > 0 ? Math.round(totalDist / miscloseDist) : Infinity;

  // Quality thresholds (common surveying standards)
  let quality: TraverseResult["quality"];
  if (precision === Infinity || precision >= 10000) quality = "excellent";
  else if (precision >= 5000) quality = "good";
  else if (precision >= 2000) quality = "fair";
  else quality = "poor";

  return {
    sumEasting: sumE,
    sumNorthing: sumN,
    miscloseDist,
    miscloseDir,
    miscloseDistStr: `${miscloseDist.toFixed(4)} m`,
    miscloseDirectionStr: bearingToDMS(miscloseDir),
    totalDist,
    precision,
    precisionStr: precision === Infinity ? "∞" : `1 : ${precision.toLocaleString()}`,
    coords,
    quality,
  };
}

/**
 * Parse a bearing string like "123.4530" or "123°45'30"" or "123 45 30"
 * Returns { deg, min, sec } or null if invalid
 */
export function parseBearingString(input: string): { deg: number; min: number; sec: number } | null {
  // Try DMS with separators: "123°45'30.5"" or "123 45 30.5" or "123-45-30.5"
  const dmsMatch = input.trim().match(/^(\d{1,3})[°\-\s](\d{1,2})['\-\s](\d{1,2}(?:\.\d+)?)"?$/);
  if (dmsMatch) {
    const deg = parseInt(dmsMatch[1]);
    const min = parseInt(dmsMatch[2]);
    const sec = parseFloat(dmsMatch[3]);
    if (deg <= 359 && min <= 59 && sec < 60) return { deg, min, sec };
  }

  // Try pure decimal degrees "123.456"
  const ddMatch = input.trim().match(/^(\d{1,3})\.(\d+)$/);
  if (ddMatch) {
    const full = parseFloat(input);
    if (full < 360) {
      const deg = Math.floor(full);
      const mf = (full - deg) * 100;  // assume DDMMSS.S compact format
      const min = Math.floor(mf);
      const sec = (mf - min) * 100;
      if (min <= 59 && sec < 60) return { deg, min, sec };
      // else treat as fractional degrees
      const min2 = Math.floor((full - deg) * 60);
      const sec2 = ((full - deg) * 60 - min2) * 60;
      return { deg, min: min2, sec: sec2 };
    }
  }

  // Try compact DDDMMSS "1234530" style
  const compactMatch = input.trim().match(/^(\d{1,3})(\d{2})(\d{2}(?:\.\d+)?)$/);
  if (compactMatch) {
    const deg = parseInt(compactMatch[1]);
    const min = parseInt(compactMatch[2]);
    const sec = parseFloat(compactMatch[3]);
    if (deg <= 359 && min <= 59 && sec < 60) return { deg, min, sec };
  }

  return null;
}

export function formatBearingDMS(deg: number, min: number, sec: number): string {
  const s = Math.round(sec);
  return `${String(deg).padStart(3, "0")}°${String(min).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}
