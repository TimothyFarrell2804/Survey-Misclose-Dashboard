"""
survey_cogo.radiation
---------------------
Compute coordinates of points observed by radiation (polar method).

Radiation (also called the polar method) calculates the coordinate of a
target point from a known setup station using a WCB bearing and
horizontal distance:

    ΔE = distance × sin(bearing)
    ΔN = distance × cos(bearing)

    E_target = E_setup + ΔE
    N_target = N_setup + ΔN

The setup station must have known MGA or local grid coordinates.
"""

import math
from .bearings import dms_to_dd, fmt_bearing

__all__ = ["radiate", "compute_radiation", "print_radiation"]


def radiate(
    setup_e:     float,
    setup_n:     float,
    bearing_deg: int,
    bearing_min: int,
    bearing_sec: int,
    distance:    float,
) -> dict:
    """
    Compute the coordinate of a single radiated point.

    Parameters
    ----------
    setup_e / setup_n   : float — setup station coordinates (MGA or local)
    bearing_deg/min/sec : int   — WCB bearing in DMS
    distance            : float — horizontal distance in metres

    Returns
    -------
    dict
        easting     (float) — computed easting
        northing    (float) — computed northing
        delta_e     (float) — ΔE from setup
        delta_n     (float) — ΔN from setup
        bearing_dd  (float) — bearing in decimal degrees
        bearing_str (str)   — bearing as DMS string
        distance    (float) — distance used

    Examples
    --------
    >>> r = radiate(1000.0, 1000.0, 90, 0, 0, 50.0)
    >>> round(r["easting"], 3)
    1050.0
    >>> round(r["northing"], 3)
    1000.0
    """
    bearing_dd = dms_to_dd(bearing_deg, bearing_min, bearing_sec)
    rad = math.radians(bearing_dd)
    de  = distance * math.sin(rad)
    dn  = distance * math.cos(rad)
    return {
        "easting":    setup_e + de,
        "northing":   setup_n + dn,
        "delta_e":    de,
        "delta_n":    dn,
        "bearing_dd": bearing_dd,
        "bearing_str": fmt_bearing(bearing_dd),
        "distance":   distance,
    }


def compute_radiation(setup: dict, shots: list[dict]) -> list[dict]:
    """
    Compute coordinates for multiple radiation shots from one setup station.

    Parameters
    ----------
    setup : dict
        Must contain:
          'easting'  (float) — setup station easting
          'northing' (float) — setup station northing
        Optional:
          'label' (str)      — station name (e.g. "IS1", "DP12345")

    shots : list of dict
        Each must contain:
          'bearing_deg' (int)   — WCB degrees  0–359
          'bearing_min' (int)   — WCB minutes  0–59
          'bearing_sec' (int)   — WCB seconds  0–59
          'distance'    (float) — horizontal distance in metres
        Optional:
          'label' (str)         — point name (e.g. "Peg A", "DP99999")

    Returns
    -------
    list of dict — one per shot (radiate() output + 'label' key)

    Raises
    ------
    ValueError — if no shots are supplied

    Examples
    --------
    >>> setup = {"label": "IS1", "easting": 1000.0, "northing": 1000.0}
    >>> shots = [{"label": "A", "bearing_deg": 0, "bearing_min": 0,
    ...           "bearing_sec": 0, "distance": 100.0}]
    >>> compute_radiation(setup, shots)[0]["northing"]
    1100.0
    """
    if not shots:
        raise ValueError("At least one radiation shot is required.")

    results = []
    for i, shot in enumerate(shots):
        r = radiate(
            setup["easting"],
            setup["northing"],
            shot["bearing_deg"],
            shot["bearing_min"],
            shot["bearing_sec"],
            shot["distance"],
        )
        r["label"] = shot.get("label") or f"R{i + 1}"
        results.append(r)

    return results


def print_radiation(setup: dict, results: list[dict]) -> None:
    """
    Pretty-print radiation results to stdout.

    Parameters
    ----------
    setup   : dict       — setup dict passed to compute_radiation()
    results : list[dict] — return value of compute_radiation()
    """
    w = 72
    label = setup.get("label", "Station")
    print("\n" + "=" * w)
    print(f"  RADIATION — Setup: {label}"
          f"   E {setup['easting']:.3f}   N {setup['northing']:.3f}")
    print("=" * w)
    print(f"  {'Point':<16} {'Bearing':>12}  {'Dist (m)':>10}"
          f"  {'Easting':>13}  {'Northing':>13}")
    print("  " + "-" * (w - 2))

    for r in results:
        de_sign = "+" if r["delta_e"] >= 0 else ""
        dn_sign = "+" if r["delta_n"] >= 0 else ""
        print(f"  {r['label']:<16} {r['bearing_str']:>12}"
              f"  {r['distance']:>10.3f}"
              f"  {r['easting']:>13.3f}  {r['northing']:>13.3f}")
        print(f"  {'':16} {'':12}  {'ΔE':>10}  "
              f"{de_sign}{r['delta_e']:>12.3f}  "
              f"{dn_sign}{r['delta_n']:>12.3f}  ΔN")

    print("=" * w)
