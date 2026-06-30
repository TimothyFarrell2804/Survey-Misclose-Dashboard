"""
survey_cogo.conversions
-----------------------
Length and area unit conversions for surveying.

Length units supported
----------------------
  metres, links, chains, feet, yards, inches, miles

  Reference constants (all exact by international definition):
    1 link   = 0.201168 m   (Gunter's chain)
    1 chain  = 100 links = 20.1168 m = 66 ft
    1 foot   = 0.3048 m     (international foot)
    1 yard   = 3 feet = 0.9144 m
    1 inch   = 0.0254 m
    1 mile   = 80 chains = 5,280 ft = 1,609.344 m

Area units supported
--------------------
  ha, m², acres, roods, perches (A–R–P), sq chains, sq feet

  Reference constants:
    1 acre   = 4 roods = 160 perches = 10 sq chains = 4,046.8564224 m²
    1 rood   = 40 perches = 1,011.7141056 m²
    1 perch  = 25.29285264 m²  (1 sq chain / 10 × 4)
    1 ha     = 10,000 m² = 2.47105381 acres
"""

__all__ = [
    "convert_length", "length_to_metres", "print_length",
    "convert_area", "area_to_m2", "arp_to_m2", "m2_to_arp", "print_area",
]

# ── Length constants ──────────────────────────────────────────────────────────
LINK_TO_M      = 0.201168
CHAIN_TO_M     = 20.1168
FOOT_TO_M      = 0.3048
YARD_TO_M      = 0.9144
INCH_TO_M      = 0.0254
MILE_TO_M      = 1_609.344

_LENGTH_FACTORS: dict[str, float] = {
    "metres":  1.0,        "m":   1.0,
    "links":   LINK_TO_M,  "lk":  LINK_TO_M,
    "chains":  CHAIN_TO_M, "ch":  CHAIN_TO_M,
    "feet":    FOOT_TO_M,  "ft":  FOOT_TO_M,
    "yards":   YARD_TO_M,  "yd":  YARD_TO_M,
    "inches":  INCH_TO_M,  "in":  INCH_TO_M,
    "miles":   MILE_TO_M,  "mi":  MILE_TO_M,
}

# ── Area constants ────────────────────────────────────────────────────────────
HA_TO_M2        = 10_000.0
ACRE_TO_M2      = 4_046.8564224
ROOD_TO_M2      = ACRE_TO_M2 / 4         # 1,011.7141056 m²
PERCH_TO_M2     = ACRE_TO_M2 / 160       # 25.29285264 m²
SQ_CHAIN_TO_M2  = CHAIN_TO_M ** 2        # 404.68564224 m²
SQ_FOOT_TO_M2   = FOOT_TO_M ** 2         # 0.09290304 m²

_AREA_FACTORS: dict[str, float] = {
    "ha":        HA_TO_M2,
    "m2":        1.0,   "m²": 1.0,
    "acres":     ACRE_TO_M2,   "ac": ACRE_TO_M2,
    "sqft":      SQ_FOOT_TO_M2, "ft2": SQ_FOOT_TO_M2,
    "sqchains":  SQ_CHAIN_TO_M2, "ch2": SQ_CHAIN_TO_M2,
}


# ══════════════════════════════════════════════════════════════════════════════
#  LENGTH
# ══════════════════════════════════════════════════════════════════════════════

def length_to_metres(value: float, unit: str) -> float:
    """
    Convert a length value to metres.

    Parameters
    ----------
    value : float — numeric length value
    unit  : str   — source unit (see module docstring for supported values)

    Returns
    -------
    float — equivalent length in metres

    Raises
    ------
    ValueError — unknown unit

    Examples
    --------
    >>> length_to_metres(100, "links")
    20.1168
    >>> length_to_metres(1, "chains")
    20.1168
    >>> length_to_metres(1, "feet")
    0.3048
    """
    key = unit.lower().strip()
    if key not in _LENGTH_FACTORS:
        raise ValueError(
            f"Unknown length unit '{unit}'. "
            f"Supported: {', '.join(sorted(set(_LENGTH_FACTORS)))}"
        )
    return float(value) * _LENGTH_FACTORS[key]


def convert_length(value: float, from_unit: str) -> dict:
    """
    Convert a length to all supported units.

    Parameters
    ----------
    value     : float — input value
    from_unit : str   — source unit

    Returns
    -------
    dict with keys: metres, links, chains, feet, yards, inches, miles

    Examples
    --------
    >>> r = convert_length(1, "chains")
    >>> r["metres"]
    20.1168
    >>> r["links"]
    100.0
    >>> r["feet"]
    66.0
    """
    m = length_to_metres(value, from_unit)
    return {
        "metres":  m,
        "links":   m / LINK_TO_M,
        "chains":  m / CHAIN_TO_M,
        "feet":    m / FOOT_TO_M,
        "yards":   m / YARD_TO_M,
        "inches":  m / INCH_TO_M,
        "miles":   m / MILE_TO_M,
    }


def print_length(value: float, from_unit: str) -> None:
    """Pretty-print a length conversion to stdout."""
    r = convert_length(value, from_unit)
    print(f"\n  Length  {value} {from_unit}")
    print("  " + "-" * 36)
    rows = [
        ("Metres",  "m",  r["metres"],  6),
        ("Links",   "lk", r["links"],   6),
        ("Chains",  "ch", r["chains"],  6),
        ("Feet",    "ft", r["feet"],    6),
        ("Yards",   "yd", r["yards"],   6),
        ("Inches",  "in", r["inches"],  4),
        ("Miles",   "mi", r["miles"],   8),
    ]
    for name, unit, val, dp in rows:
        print(f"  {name:<12} {val:>20.{dp}f}  {unit}")


# ══════════════════════════════════════════════════════════════════════════════
#  AREA
# ══════════════════════════════════════════════════════════════════════════════

def area_to_m2(value: float, unit: str) -> float:
    """
    Convert an area value to square metres.

    Parameters
    ----------
    value : float — numeric area value
    unit  : str   — source unit: 'ha', 'm2', 'acres', 'sqft', 'sqchains'

    Returns
    -------
    float — equivalent area in square metres

    Raises
    ------
    ValueError — unknown unit

    Examples
    --------
    >>> area_to_m2(1, "ha")
    10000.0
    >>> round(area_to_m2(1, "acres"), 7)
    4046.8564224
    """
    key = unit.lower().replace(" ", "").replace("²", "2")
    if key not in _AREA_FACTORS:
        raise ValueError(
            f"Unknown area unit '{unit}'. "
            f"Supported: {', '.join(sorted(set(_AREA_FACTORS)))}"
        )
    return float(value) * _AREA_FACTORS[key]


def m2_to_arp(m2: float) -> dict:
    """
    Decompose square metres into integer Acres–Roods–Perches + remainder m².

    Parameters
    ----------
    m2 : float — area in square metres

    Returns
    -------
    dict — acres (int), roods (int), perches (int), rem_m2 (float)

    Examples
    --------
    >>> m2_to_arp(4046.8564224)
    {'acres': 1, 'roods': 0, 'perches': 0, 'rem_m2': 0.0}
    """
    total_perches = m2 / PERCH_TO_M2
    acres   = int(total_perches // 160)
    roods   = int((total_perches - acres * 160) // 40)
    perches = int(total_perches - acres * 160 - roods * 40)
    rem_m2  = m2 - (acres * 160 + roods * 40 + perches) * PERCH_TO_M2
    return {"acres": acres, "roods": roods, "perches": perches, "rem_m2": rem_m2}


def arp_to_m2(acres: int, roods: int, perches: float) -> float:
    """
    Convert Acres–Roods–Perches to square metres.

    Parameters
    ----------
    acres   : int or float
    roods   : int (0–3)
    perches : int or float (0–39)

    Returns
    -------
    float — area in square metres

    Examples
    --------
    >>> round(arp_to_m2(1, 2, 0), 7)
    2023.4282112
    """
    return (int(acres) * 160 + int(roods) * 40 + float(perches)) * PERCH_TO_M2


def convert_area(value: float, from_unit: str) -> dict:
    """
    Convert an area to all supported units.

    Parameters
    ----------
    value     : float — input value
    from_unit : str   — source unit

    Returns
    -------
    dict with keys:
        m2, ha, acres, roods, perches, sq_chains, sq_feet,
        arp (dict from m2_to_arp)

    Examples
    --------
    >>> r = convert_area(1, "ha")
    >>> round(r["acres"], 6)
    2.471054
    >>> r["arp"]["acres"]
    2
    """
    m2  = area_to_m2(value, from_unit)
    arp = m2_to_arp(m2)
    return {
        "m2":        m2,
        "ha":        m2 / HA_TO_M2,
        "acres":     m2 / ACRE_TO_M2,
        "roods":     m2 / ROOD_TO_M2,
        "perches":   m2 / PERCH_TO_M2,
        "sq_chains": m2 / SQ_CHAIN_TO_M2,
        "sq_feet":   m2 / SQ_FOOT_TO_M2,
        "arp":       arp,
    }


def print_area(value: float, from_unit: str) -> None:
    """Pretty-print an area conversion to stdout."""
    r   = convert_area(value, from_unit)
    arp = r["arp"]
    print(f"\n  Area  {value} {from_unit}")
    print("  " + "-" * 44)
    print(f"  {'Square metres':<24} {r['m2']:>16.4f}  m²")
    print(f"  {'Hectares':<24} {r['ha']:>16.6f}  ha")
    print(f"  {'Acres (decimal)':<24} {r['acres']:>16.6f}  ac")
    print(f"  {'Roods':<24} {r['roods']:>16.6f}  ro")
    print(f"  {'Perches':<24} {r['perches']:>16.4f}  p")
    print(f"  {'Square chains':<24} {r['sq_chains']:>16.6f}  ch²")
    print(f"  {'Square feet':<24} {r['sq_feet']:>16.2f}  ft²")
    rem = f"  + {arp['rem_m2']:.4f} m²" if arp["rem_m2"] > 0.0001 else ""
    print(f"\n  A–R–P :  {arp['acres']}a  {arp['roods']}r  {arp['perches']}p{rem}")
