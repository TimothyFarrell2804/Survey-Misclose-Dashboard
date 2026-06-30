"""
survey_cogo.join
----------------
Compute WCB bearing and distance between coordinate pairs (Join).

A join calculates the bearing and distance from each point to the next
in a sequence. An optional grid scale factor (SF) converts grid distances
to ground distances:

    Ground distance = Grid distance ÷ Scale Factor

For MGA2020 in NSW the scale factor is typically 0.9996 near the central
meridian, varying slightly across each zone.
"""

import math
from .bearings import bearing_between, fmt_bearing

__all__ = ["compute_joins", "print_joins"]


def compute_joins(
    points: list[dict],
    scale_factor: float = 1.0,
) -> list[dict]:
    """
    Compute sequential joins (bearing + distance) between a list of points.

    Parameters
    ----------
    points : list of dict
        Each dict must contain:
          'easting'  (float) — MGA or local grid easting
          'northing' (float) — MGA or local grid northing
        Optional:
          'label' (str)      — point identifier (e.g. "DP12345")

    scale_factor : float, default 1.0
        Grid scale factor. Pass 1.0 for no correction.
        Grid distance  = ground distance × SF
        Ground distance = grid distance ÷ SF

    Returns
    -------
    list of dict — one entry per line segment:
        from_label      (str)   — label of start point
        to_label        (str)   — label of end point
        bearing_dd      (float) — WCB in decimal degrees
        bearing_str     (str)   — WCB as DMS string
        grid_distance   (float) — distance in grid units (metres)
        ground_distance (float) — distance on the ground (metres)
        delta_e         (float) — ΔE (metres)
        delta_n         (float) — ΔN (metres)

    Raises
    ------
    ValueError — if fewer than 2 points are supplied

    Examples
    --------
    >>> pts = [
    ...     {"label": "A", "easting": 1000.0, "northing": 1000.0},
    ...     {"label": "B", "easting": 1100.0, "northing": 1100.0},
    ... ]
    >>> compute_joins(pts)[0]["bearing_str"]
    "045°00'00\""
    """
    if len(points) < 2:
        raise ValueError("Join requires at least 2 points.")

    sf      = scale_factor if scale_factor > 0 else 1.0
    results = []

    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        de   = b["easting"]  - a["easting"]
        dn   = b["northing"] - a["northing"]
        grid_dist   = math.sqrt(de ** 2 + dn ** 2)
        ground_dist = grid_dist / sf
        bear        = bearing_between(
            a["easting"], a["northing"],
            b["easting"], b["northing"],
        )
        results.append({
            "from_label":      a.get("label") or f"Pt {i + 1}",
            "to_label":        b.get("label") or f"Pt {i + 2}",
            "bearing_dd":      bear,
            "bearing_str":     fmt_bearing(bear),
            "grid_distance":   grid_dist,
            "ground_distance": ground_dist,
            "delta_e":         de,
            "delta_n":         dn,
        })

    return results


def print_joins(
    results: list[dict],
    scale_factor: float = 1.0,
    name: str = "Join",
) -> None:
    """
    Pretty-print join results to stdout.

    Parameters
    ----------
    results      : list of dict — return value of compute_joins()
    scale_factor : float        — scale factor used (for display only)
    name         : str          — session name shown in header
    """
    show_ground = abs(scale_factor - 1.0) > 1e-9
    w = 76
    print("\n" + "=" * w)
    print(f"  JOIN — {name}  (SF = {scale_factor})")
    print("=" * w)

    hdr = (f"  {'From':<14} {'To':<14} {'Bearing':>12}"
           f"  {'Grid dist':>12}")
    if show_ground:
        hdr += f"  {'Ground dist':>12}"
    hdr += f"  {'ΔE':>10}  {'ΔN':>10}"
    print(hdr)
    print("  " + "-" * (w - 2))

    for r in results:
        row = (f"  {r['from_label']:<14} {r['to_label']:<14}"
               f" {r['bearing_str']:>12}"
               f"  {r['grid_distance']:>11.4f}m")
        if show_ground:
            row += f"  {r['ground_distance']:>11.4f}m"
        row += f"  {r['delta_e']:>+10.4f}  {r['delta_n']:>+10.4f}"
        print(row)

    print("=" * w)
