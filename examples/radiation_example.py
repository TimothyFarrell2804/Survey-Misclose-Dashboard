"""
Example — Radiation (polar coordinate computation)
===================================================
Compute coordinates of three pegs observed from a known setup station.
"""
from survey_cogo import compute_radiation, print_radiation

setup = {
    "label":    "IS1",
    "easting":  312_450.000,
    "northing": 6_251_320.000,
}

shots = [
    {"label": "Peg A", "bearing_deg": 45,  "bearing_min": 30, "bearing_sec": 0, "distance": 25.450},
    {"label": "Peg B", "bearing_deg": 162, "bearing_min": 15, "bearing_sec": 0, "distance": 38.720},
    {"label": "Peg C", "bearing_deg": 280, "bearing_min": 45, "bearing_sec": 0, "distance": 19.180},
]

results = compute_radiation(setup, shots)
print_radiation(setup, results)

# Access individual coordinates
for r in results:
    print(f"\n{r['label']:10}  E {r['easting']:.3f}   N {r['northing']:.3f}")
