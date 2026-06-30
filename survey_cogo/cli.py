"""
survey_cogo.cli
---------------
Interactive command-line interface for Survey COGO.

Run with:
    python -m survey_cogo
or:
    python -m survey_cogo --demo
"""

import sys
from .traverse    import compute_traverse, print_traverse
from .join        import compute_joins, print_joins
from .radiation   import compute_radiation, print_radiation
from .conversions import (
    convert_length, print_length,
    convert_area, print_area, arp_to_m2,
)


# ── Input helpers ─────────────────────────────────────────────────────────────

def _get_float(prompt: str) -> float:
    while True:
        try:
            return float(input(prompt).strip())
        except ValueError:
            print("  ✗  Please enter a number.")


def _get_int(prompt: str, lo: int = 0, hi: int = 9999) -> int:
    while True:
        try:
            v = int(input(prompt).strip())
            if lo <= v <= hi:
                return v
            print(f"  ✗  Must be {lo}–{hi}.")
        except ValueError:
            print("  ✗  Please enter a whole number.")


def _get_str(prompt: str, default: str = "") -> str:
    v = input(prompt).strip()
    return v if v else default


# ── Module menus ──────────────────────────────────────────────────────────────

def _menu_traverse():
    print("\n── Traverse ─────────────────────────────────────────────────────")
    name = _get_str("  Traverse name [Enter to skip]: ", "Traverse 1")
    legs = []
    while True:
        n = len(legs) + 1
        print(f"\n  Traverse line {n}  — leave Distance blank to finish")
        label    = _get_str(f"    Label [Line {n}]: ", f"Line {n}")
        dist_str = input("    Distance (m): ").strip()
        if not dist_str:
            if len(legs) < 2:
                print("  ✗  Need at least 2 lines to compute."); continue
            break
        try:
            dist = float(dist_str)
        except ValueError:
            print("  ✗  Invalid distance."); continue
        d = _get_int("    Bearing DEG (0–359): ", 0, 359)
        m = _get_int("    Bearing MIN (0–59):  ", 0, 59)
        s = _get_int("    Bearing SEC (0–59):  ", 0, 59)
        legs.append({"label": label, "bearing_deg": d,
                     "bearing_min": m, "bearing_sec": s, "distance": dist})
    try:
        print_traverse(compute_traverse(legs), name)
    except Exception as e:
        print(f"  ✗  {e}")


def _menu_join():
    print("\n── Join ─────────────────────────────────────────────────────────")
    name   = _get_str("  Session name [Enter to skip]: ", "Join 1")
    sf_str = input("  Scale factor [1.0]: ").strip()
    sf     = float(sf_str) if sf_str else 1.0
    points = []
    while True:
        n = len(points) + 1
        print(f"\n  Point {n}  — leave Easting blank to finish")
        label = _get_str(f"    Label [Pt {n}]: ", f"Pt {n}")
        e_str = input("    Easting:  ").strip()
        if not e_str:
            if len(points) < 2:
                print("  ✗  Need at least 2 points."); continue
            break
        n_str = input("    Northing: ").strip()
        try:
            points.append({"label": label,
                            "easting":  float(e_str),
                            "northing": float(n_str)})
        except ValueError:
            print("  ✗  Invalid coordinates.")
    try:
        print_joins(compute_joins(points, sf), sf, name)
    except Exception as e:
        print(f"  ✗  {e}")


def _menu_radiation():
    print("\n── Radiation ────────────────────────────────────────────────────")
    label  = _get_str("  Setup station label: ", "Station")
    e      = _get_float("  Setup Easting:  ")
    n      = _get_float("  Setup Northing: ")
    setup  = {"label": label, "easting": e, "northing": n}
    shots  = []
    while True:
        idx      = len(shots) + 1
        print(f"\n  Shot {idx}  — leave Distance blank to finish")
        slabel   = _get_str(f"    Point label [R{idx}]: ", f"R{idx}")
        d_str    = input("    Distance (m): ").strip()
        if not d_str:
            if not shots:
                print("  ✗  Need at least 1 shot."); continue
            break
        try:
            dist = float(d_str)
        except ValueError:
            print("  ✗  Invalid distance."); continue
        bd = _get_int("    Bearing DEG (0–359): ", 0, 359)
        bm = _get_int("    Bearing MIN (0–59):  ", 0, 59)
        bs = _get_int("    Bearing SEC (0–59):  ", 0, 59)
        shots.append({"label": slabel, "bearing_deg": bd,
                      "bearing_min": bm, "bearing_sec": bs, "distance": dist})
    try:
        print_radiation(setup, compute_radiation(setup, shots))
    except Exception as e:
        print(f"  ✗  {e}")


def _menu_conversions():
    print("\n── Conversions ──────────────────────────────────────────────────")
    print("  1. Length  (metres, links, chains, feet, yards, inches, miles)")
    print("  2. Area    (ha, m², acres, A–R–P, sq chains, sq feet)")
    choice = input("  Select (1 / 2): ").strip()
    if choice == "1":
        unit = _get_str("  From unit: ", "metres")
        val  = _get_float(f"  Value ({unit}): ")
        try:
            print_length(val, unit)
        except ValueError as err:
            print(f"  ✗  {err}")
    elif choice == "2":
        print("  Input mode:")
        print("    1. Decimal value  (e.g. 2.5 ha)")
        print("    2. Acres–Roods–Perches")
        mode = input("  Select (1 / 2): ").strip()
        if mode == "2":
            a  = _get_int("  Acres:   ", 0, 999_999)
            r  = _get_int("  Roods:   ", 0, 3)
            p  = _get_int("  Perches: ", 0, 39)
            print_area(arp_to_m2(a, r, p), "m2")
        else:
            unit = _get_str("  Unit (ha / m2 / acres / sqft / sqchains): ", "ha")
            val  = _get_float(f"  Value ({unit}): ")
            try:
                print_area(val, unit)
            except ValueError as err:
                print(f"  ✗  {err}")
    else:
        print("  ✗  Invalid choice.")


# ── Demo ──────────────────────────────────────────────────────────────────────

def run_demo():
    """Run a self-contained demo of all four modules."""
    print("\n╔══════════════════════════════════════════╗")
    print("║   Survey COGO  —  Demo / Self-test       ║")
    print("╚══════════════════════════════════════════╝")

    # Traverse
    legs = [
        {"label": "AB", "bearing_deg": 45,  "bearing_min": 30, "bearing_sec": 0,  "distance": 123.456},
        {"label": "BC", "bearing_deg": 162, "bearing_min": 15, "bearing_sec": 0,  "distance": 98.200},
        {"label": "CD", "bearing_deg": 250, "bearing_min": 0,  "bearing_sec": 30, "distance": 87.340},
        {"label": "DA", "bearing_deg": 340, "bearing_min": 45, "bearing_sec": 0,  "distance": 110.000},
    ]
    print_traverse(compute_traverse(legs), "Demo Traverse")

    # Join
    points = [
        {"label": "DP001", "easting": 312_450.000, "northing": 6_251_320.000},
        {"label": "DP002", "easting": 312_487.234, "northing": 6_251_358.456},
        {"label": "DP003", "easting": 312_512.100, "northing": 6_251_290.780},
    ]
    print_joins(compute_joins(points, 0.99960), 0.99960, "Demo Join")

    # Radiation
    setup = {"label": "IS1", "easting": 312_450.000, "northing": 6_251_320.000}
    shots = [
        {"label": "Peg A", "bearing_deg": 45,  "bearing_min": 30, "bearing_sec": 0, "distance": 25.450},
        {"label": "Peg B", "bearing_deg": 162, "bearing_min": 15, "bearing_sec": 0, "distance": 38.720},
        {"label": "Peg C", "bearing_deg": 280, "bearing_min": 45, "bearing_sec": 0, "distance": 19.180},
    ]
    print_radiation(setup, compute_radiation(setup, shots))

    # Conversions
    print_length(100.0, "links")
    print_area(1.0, "ha")
    print_area(2.0, "acres")


# ── Main menu ─────────────────────────────────────────────────────────────────

def main():
    print("\n╔══════════════════════════════════════════╗")
    print("║        Survey COGO  —  v1.0.0            ║")
    print("║        Treasco Surveyors                 ║")
    print("╚══════════════════════════════════════════╝")

    options = {
        "1": ("Traverse   — Misclose & Precision", _menu_traverse),
        "2": ("Join       — Bearing & Distance",   _menu_join),
        "3": ("Radiation  — Polar Coordinate",     _menu_radiation),
        "4": ("Convert    — Length & Area",        _menu_conversions),
        "0": ("Quit", None),
    }

    while True:
        print("\n  ── Main Menu ─────────────────────────────")
        for k, (label, _) in options.items():
            print(f"  {k}.  {label}")
        choice = input("\n  Select: ").strip()
        if choice == "0":
            print("\n  Goodbye.\n")
            sys.exit(0)
        if choice in options and options[choice][1]:
            options[choice][1]()
        else:
            print("  ✗  Invalid selection — enter 0, 1, 2, 3 or 4.")
