"""
Example — Unit conversions (length and area)
============================================
"""
from survey_cogo import (
    convert_length, print_length,
    convert_area, print_area, arp_to_m2, m2_to_arp,
)

# ── Length ────────────────────────────────────────────────────────────────────
print("=" * 50)
print("  LENGTH CONVERSIONS")
print("=" * 50)

print_length(100,  "links")   # 100 links → all units
print_length(1,    "chains")  # 1 chain → all units
print_length(1,    "feet")    # 1 foot → all units

# Access values directly
r = convert_length(1, "chains")
print(f"\n1 chain = {r['metres']} m = {r['feet']} ft = {r['links']} links")

# ── Area ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 50)
print("  AREA CONVERSIONS")
print("=" * 50)

print_area(1.0, "ha")      # 1 ha → all units
print_area(1.0, "acres")   # 1 acre → all units

# ARP → m²
m2 = arp_to_m2(acres=2, roods=1, perches=35)
print(f"\n2a 1r 35p = {m2:.4f} m²")

# m² → ARP breakdown
arp = m2_to_arp(10_000)
print(f"10 000 m² = {arp['acres']}a {arp['roods']}r {arp['perches']}p + {arp['rem_m2']:.4f} m²")
