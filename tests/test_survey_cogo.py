"""
Basic unit tests for survey_cogo.
Run with:  python -m pytest tests/  or  python tests/test_survey_cogo.py
"""
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from survey_cogo.bearings    import dms_to_dd, dd_to_dms, fmt_bearing, bearing_between
from survey_cogo.traverse    import compute_traverse
from survey_cogo.join        import compute_joins
from survey_cogo.radiation   import radiate, compute_radiation
from survey_cogo.conversions import (
    length_to_metres, convert_length,
    area_to_m2, arp_to_m2, m2_to_arp, convert_area,
)


def assert_close(a, b, tol=1e-6, msg=""):
    assert abs(a - b) < tol, f"{msg}: expected {b}, got {a}"


# ── Bearings ──────────────────────────────────────────────────────────────────

def test_dms_to_dd_basic():
    assert_close(dms_to_dd(45, 30, 0), 45.5)
    assert_close(dms_to_dd(0, 0, 0), 0.0)
    assert_close(dms_to_dd(180, 0, 0), 180.0)

def test_dms_to_dd_seconds():
    assert_close(dms_to_dd(0, 0, 3600), 1.0)

def test_dd_to_dms_round_trip():
    for dd in [0.0, 45.5, 90.0, 180.0, 270.0, 359.999]:
        d, m, s = dd_to_dms(dd)
        back = dms_to_dd(d, m, s)
        assert abs(back - (dd % 360)) < 1/3600 + 0.5/3600, f"Round-trip failed for {dd}"

def test_fmt_bearing():
    assert fmt_bearing(45.5) == "045°30'00\""
    assert fmt_bearing(0.0)  == "000°00'00\""
    assert fmt_bearing(360.0) == "000°00'00\""

def test_bearing_between_north():
    assert_close(bearing_between(0, 0, 0, 100), 0.0)

def test_bearing_between_east():
    assert_close(bearing_between(0, 0, 100, 0), 90.0)

def test_bearing_between_south():
    assert_close(bearing_between(0, 0, 0, -100), 180.0)

def test_bearing_between_west():
    assert_close(bearing_between(0, 0, -100, 0), 270.0)

def test_bearing_between_ne():
    assert_close(bearing_between(0, 0, 100, 100), 45.0)


# ── Traverse ──────────────────────────────────────────────────────────────────

def _square_traverse():
    """Perfect square — should close exactly."""
    return [
        {"bearing_deg": 0,   "bearing_min": 0, "bearing_sec": 0, "distance": 100.0},
        {"bearing_deg": 90,  "bearing_min": 0, "bearing_sec": 0, "distance": 100.0},
        {"bearing_deg": 180, "bearing_min": 0, "bearing_sec": 0, "distance": 100.0},
        {"bearing_deg": 270, "bearing_min": 0, "bearing_sec": 0, "distance": 100.0},
    ]

def test_traverse_perfect_close():
    r = compute_traverse(_square_traverse())
    assert_close(r["sum_e"], 0.0, tol=1e-9)
    assert_close(r["sum_n"], 0.0, tol=1e-9)
    assert_close(r["misclose_dist"], 0.0, tol=1e-9)
    assert r["quality"] == "excellent"
    assert r["precision"] == float("inf")

def test_traverse_total_distance():
    r = compute_traverse(_square_traverse())
    assert_close(r["total_dist"], 400.0)

def test_traverse_minimum_legs():
    try:
        compute_traverse([{"bearing_deg": 0, "bearing_min": 0,
                           "bearing_sec": 0, "distance": 10}])
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

def test_traverse_ne_bearing():
    r = compute_traverse([
        {"bearing_deg": 45, "bearing_min": 0, "bearing_sec": 0, "distance": math.sqrt(2)},
        {"bearing_deg": 225, "bearing_min": 0, "bearing_sec": 0, "distance": math.sqrt(2)},
    ])
    assert_close(r["sum_e"], 0.0, tol=1e-9)
    assert_close(r["sum_n"], 0.0, tol=1e-9)


# ── Join ──────────────────────────────────────────────────────────────────────

def test_join_basic():
    pts = [
        {"label": "A", "easting": 0.0, "northing": 0.0},
        {"label": "B", "easting": 0.0, "northing": 100.0},
    ]
    r = compute_joins(pts)[0]
    assert_close(r["bearing_dd"],    0.0)
    assert_close(r["grid_distance"], 100.0)
    assert_close(r["delta_e"],       0.0)
    assert_close(r["delta_n"],       100.0)

def test_join_east():
    pts = [
        {"easting": 0.0, "northing": 0.0},
        {"easting": 50.0, "northing": 0.0},
    ]
    r = compute_joins(pts)[0]
    assert_close(r["bearing_dd"], 90.0)
    assert_close(r["grid_distance"], 50.0)

def test_join_scale_factor():
    pts = [
        {"easting": 0.0, "northing": 0.0},
        {"easting": 100.0, "northing": 0.0},
    ]
    r = compute_joins(pts, scale_factor=0.5)[0]
    assert_close(r["grid_distance"],   100.0)
    assert_close(r["ground_distance"], 200.0)

def test_join_minimum_points():
    try:
        compute_joins([{"easting": 0, "northing": 0}])
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


# ── Radiation ─────────────────────────────────────────────────────────────────

def test_radiate_north():
    r = radiate(1000.0, 1000.0, 0, 0, 0, 50.0)
    assert_close(r["easting"],  1000.0)
    assert_close(r["northing"], 1050.0)

def test_radiate_east():
    r = radiate(1000.0, 1000.0, 90, 0, 0, 50.0)
    assert_close(r["easting"],  1050.0)
    assert_close(r["northing"], 1000.0)

def test_radiate_south():
    r = radiate(1000.0, 1000.0, 180, 0, 0, 50.0)
    assert_close(r["easting"],  1000.0, tol=1e-9)
    assert_close(r["northing"], 950.0)

def test_radiate_west():
    r = radiate(1000.0, 1000.0, 270, 0, 0, 50.0)
    assert_close(r["easting"],  950.0)
    assert_close(r["northing"], 1000.0, tol=1e-9)

def test_radiation_delta():
    setup = {"easting": 500.0, "northing": 500.0}
    shots = [{"bearing_deg": 0, "bearing_min": 0, "bearing_sec": 0, "distance": 25.0}]
    r = compute_radiation(setup, shots)[0]
    assert_close(r["delta_e"], 0.0,  tol=1e-9)
    assert_close(r["delta_n"], 25.0)


# ── Conversions — Length ──────────────────────────────────────────────────────

def test_length_metres_identity():
    assert_close(length_to_metres(1.0, "metres"), 1.0)

def test_length_link_to_metres():
    assert_close(length_to_metres(1, "links"), 0.201168)

def test_length_chain_to_metres():
    assert_close(length_to_metres(1, "chains"), 20.1168)

def test_length_foot_to_metres():
    assert_close(length_to_metres(1, "feet"), 0.3048)

def test_length_100_links_equals_1_chain():
    assert_close(length_to_metres(100, "links"),
                 length_to_metres(1, "chains"))

def test_length_chain_equals_66_feet():
    assert_close(length_to_metres(1, "chains"),
                 length_to_metres(66, "feet"))

def test_length_unknown_unit():
    try:
        length_to_metres(1, "furlongs")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


# ── Conversions — Area ────────────────────────────────────────────────────────

def test_area_ha_to_m2():
    assert_close(area_to_m2(1, "ha"), 10_000.0)

def test_area_acre_to_m2():
    assert_close(area_to_m2(1, "acres"), 4046.8564224)

def test_area_arp_1_acre():
    assert_close(arp_to_m2(1, 0, 0), 4046.8564224)

def test_area_arp_4_roods():
    assert_close(arp_to_m2(0, 4, 0), arp_to_m2(1, 0, 0))

def test_area_arp_160_perches():
    assert_close(arp_to_m2(0, 0, 160), arp_to_m2(1, 0, 0))

def test_m2_to_arp_one_acre():
    arp = m2_to_arp(4046.8564224)
    assert arp["acres"]   == 1
    assert arp["roods"]   == 0
    assert arp["perches"] == 0
    assert_close(arp["rem_m2"], 0.0, tol=1e-4)

def test_m2_to_arp_round_trip():
    for ac, ro, pe in [(2, 1, 35), (0, 3, 20), (10, 0, 0)]:
        m2  = arp_to_m2(ac, ro, pe)
        arp = m2_to_arp(m2)
        # Allow ±1 perch tolerance due to floating-point precision
        total_in  = ac * 160 + ro * 40 + pe
        total_out = arp["acres"] * 160 + arp["roods"] * 40 + arp["perches"]
        assert abs(total_in - total_out) <= 1, (
            f"Round-trip failed for {ac}a {ro}r {pe}p: got "
            f"{arp['acres']}a {arp['roods']}r {arp['perches']}p"
        )


# ── Runner ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for fn in tests:
        try:
            fn()
            print(f"  ✓  {fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  ✗  {fn.__name__}: {e}")
            failed += 1
    print(f"\n  {passed} passed  |  {failed} failed")
    sys.exit(0 if failed == 0 else 1)
