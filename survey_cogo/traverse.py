"""
survey_cogo.traverse
--------------------
Closed traverse misclose and precision computation.

A traverse is a series of lines defined by a WCB bearing and horizontal
distance. For a closed traverse the sum of ΔE and ΔN should return to
zero; any residual is the misclose vector.

Precision ratio  =  Total perimeter ÷ Linear misclose  (expressed 1 : X)

Quality thresholds (common Australian surveying standards):
  Excellent  ≥ 1 : 10 000
  Good       ≥ 1 :  5 000
  Fair       ≥ 1 :  2 000
  Poor         <  1 :  2 000
"""

import math
from .bearings import dms_to_dd, fmt_bearing

__all__ = ["compute_traverse", "print_traverse"]


def compute_traverse(legs: list[dict]) -> dict:
    """
    Compute misclose and precision for a closed traverse.

    Parameters
    ----------
    legs : list of dict
        Each dict must contain:
          'bearing_deg' (int)   — degrees  0–359
          'bearing_min' (int)   — minutes  0–59
          'bearing_sec' (int)   — seconds  0–59
          'distance'    (float) — horizontal distance in metres
        Optional:
          'label' (str)         — line identifier (e.g. "Line 1", "AB")

    Returns
    -------
    dict
        sum_e            (float)  — ΣΔE in metres
        sum_n            (float)  — ΣΔN in metres
        misclose_dist    (float)  — linear misclose in metres
        misclose_dir     (float)  — bearing of misclose vector (decimal °)
        misclose_dir_str (str)    — misclose bearing as DMS string
        total_dist       (float)  — total perimeter distance in metres
        precision        (int | float)  — 1:X value (float('inf') if perfect)
        precision_str    (str)    — e.g. "1 : 12 500"
        quality          (str)    — "excellent" | "good" | "fair" | "poor"
        lines            (list)   — per-line computation details

    Raises
    ------
    ValueError — if fewer than 2 legs are supplied

    Examples
    --------
    >>> legs = [
    ...     {"bearing_deg": 45,  "bearing_min": 30, "bearing_sec": 0, "distance": 100.0},
    ...     {"bearing_deg": 135, "bearing_min": 30, "bearing_sec": 0, "distance": 100.0},
    ...     {"bearing_deg": 225, "bearing_min": 30, "bearing_sec": 0, "distance": 100.0},
    ...     {"bearing_deg": 315, "bearing_min": 30, "bearing_sec": 0, "distance": 100.0},
    ... ]
    >>> result = compute_traverse(legs)
    >>> result["quality"]
    'excellent'
    """
    if len(legs) < 2:
        raise ValueError("A traverse requires at least 2 lines.")

    lines      = []
    sum_e      = 0.0
    sum_n      = 0.0
    total_dist = 0.0

    for leg in legs:
        bearing_dd = dms_to_dd(
            leg["bearing_deg"],
            leg["bearing_min"],
            leg["bearing_sec"],
        )
        rad  = math.radians(bearing_dd)
        de   = leg["distance"] * math.sin(rad)
        dn   = leg["distance"] * math.cos(rad)
        sum_e      += de
        sum_n      += dn
        total_dist += leg["distance"]

        lines.append({
            "label":       leg.get("label", ""),
            "bearing_dd":  bearing_dd,
            "bearing_str": fmt_bearing(bearing_dd),
            "distance":    leg["distance"],
            "delta_e":     de,
            "delta_n":     dn,
        })

    misclose_dist = math.sqrt(sum_e ** 2 + sum_n ** 2)
    misclose_dir  = (math.degrees(math.atan2(sum_e, sum_n)) % 360 + 360) % 360

    if misclose_dist > 1e-9:
        precision = round(total_dist / misclose_dist)
    else:
        precision = float("inf")

    if precision == float("inf") or precision >= 10_000:
        quality = "excellent"
    elif precision >= 5_000:
        quality = "good"
    elif precision >= 2_000:
        quality = "fair"
    else:
        quality = "poor"

    prec_str = "∞" if precision == float("inf") else f"1 : {int(precision):,}"

    return {
        "sum_e":            sum_e,
        "sum_n":            sum_n,
        "misclose_dist":    misclose_dist,
        "misclose_dir":     misclose_dir,
        "misclose_dir_str": fmt_bearing(misclose_dir),
        "total_dist":       total_dist,
        "precision":        precision,
        "precision_str":    prec_str,
        "quality":          quality,
        "lines":            lines,
    }


def print_traverse(result: dict, name: str = "Traverse") -> None:
    """
    Pretty-print traverse results to stdout.

    Parameters
    ----------
    result : dict — return value of compute_traverse()
    name   : str  — traverse name shown in header
    """
    w = 72
    print("\n" + "=" * w)
    print(f"  TRAVERSE — {name}")
    print("=" * w)
    print(f"  {'Line':<18} {'Bearing':>12}  {'Dist (m)':>10}"
          f"  {'ΔE (m)':>10}  {'ΔN (m)':>10}")
    print("  " + "-" * (w - 2))

    for i, ln in enumerate(result["lines"], 1):
        lbl = ln["label"] or f"Line {i}"
        print(f"  {lbl:<18} {ln['bearing_str']:>12}"
              f"  {ln['distance']:>10.3f}"
              f"  {ln['delta_e']:>+10.4f}"
              f"  {ln['delta_n']:>+10.4f}")

    print("  " + "-" * (w - 2))
    print(f"  {'Total distance':<36} {result['total_dist']:>10.3f} m")
    print(f"  {'ΣΔE':<36} {result['sum_e']:>+10.4f} m")
    print(f"  {'ΣΔN':<36} {result['sum_n']:>+10.4f} m")
    print(f"  {'Linear misclose':<36} {result['misclose_dist']:>10.4f} m")
    print(f"  {'Direction of misclose':<36} {result['misclose_dir_str']:>12}")
    print(f"  {'Precision':<36} {result['precision_str']:>12}")
    print(f"  {'Quality':<36} {result['quality'].upper():>12}")
    print("=" * w)
