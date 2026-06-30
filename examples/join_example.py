"""
Example — Join (bearing and distance between coordinates)
=========================================================
Three MGA2020 points with a GDA2020 scale factor applied.
"""
from survey_cogo import compute_joins, print_joins

points = [
    {"label": "DP001", "easting": 312_450.000, "northing": 6_251_320.000},
    {"label": "DP002", "easting": 312_487.234, "northing": 6_251_358.456},
    {"label": "DP003", "easting": 312_512.100, "northing": 6_251_290.780},
]

# MGA2020 Zone 56 central scale factor (approximate)
scale_factor = 0.99960

results = compute_joins(points, scale_factor=scale_factor)
print_joins(results, scale_factor=scale_factor, name="Example Join")

# Access individual values
for r in results:
    print(f"\n{r['from_label']} → {r['to_label']}")
    print(f"  Bearing       : {r['bearing_str']}")
    print(f"  Grid distance : {r['grid_distance']:.4f} m")
    print(f"  Ground dist   : {r['ground_distance']:.4f} m")
