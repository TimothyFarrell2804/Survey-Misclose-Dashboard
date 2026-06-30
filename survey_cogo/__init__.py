"""
Survey COGO — Surveying Computations in Python
===============================================
Treasco Surveyors  |  https://github.com/treasco/survey-cogo

Modules
-------
  bearings     — DMS ↔ decimal degrees, WCB bearing between points
  traverse     — misclose & precision for closed traverses
  join         — bearing & distance between coordinate pairs
  radiation    — compute coordinates from a setup station
  conversions  — length and area unit conversions
"""

from .bearings    import dms_to_dd, dd_to_dms, fmt_bearing, bearing_between
from .traverse    import compute_traverse, print_traverse
from .join        import compute_joins, print_joins
from .radiation   import radiate, compute_radiation, print_radiation
from .conversions import (
    convert_length, length_to_metres, print_length,
    convert_area, area_to_m2, arp_to_m2, m2_to_arp, print_area,
)

__version__ = "1.0.0"
__author__  = "Treasco Surveyors"
