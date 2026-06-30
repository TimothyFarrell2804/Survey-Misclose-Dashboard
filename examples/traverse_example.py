"""
Example — Traverse misclose and precision
=========================================
A four-line closed traverse with bearings and distances.
"""
from survey_cogo import compute_traverse, print_traverse

legs = [
    {"label": "AB", "bearing_deg": 45,  "bearing_min": 30, "bearing_sec": 0,  "distance": 123.456},
    {"label": "BC", "bearing_deg": 162, "bearing_min": 15, "bearing_sec": 0,  "distance": 98.200},
    {"label": "CD", "bearing_deg": 250, "bearing_min": 0,  "bearing_sec": 30, "distance": 87.340},
    {"label": "DA", "bearing_deg": 340, "bearing_min": 45, "bearing_sec": 0,  "distance": 110.000},
]

result = compute_traverse(legs)
print_traverse(result, name="Example Traverse")

# Access individual values programmatically
print(f"\nMisclose distance : {result['misclose_dist']:.4f} m")
print(f"Precision         : {result['precision_str']}")
print(f"Quality           : {result['quality']}")
