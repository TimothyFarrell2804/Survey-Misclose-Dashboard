"""
survey_cogo.bearings
--------------------
DMS ↔ decimal degree conversions and WCB bearing computation.

All bearings are Whole-Circle Bearings (WCB), 0–360°, measured
clockwise from north — the Australian surveying convention.
"""

import math

__all__ = ["dms_to_dd", "dd_to_dms", "fmt_bearing", "bearing_between"]


def dms_to_dd(deg: float, min: float, sec: float) -> float:
    """
    Convert degrees-minutes-seconds to decimal degrees.

    Parameters
    ----------
    deg : int or float  — degrees (0–359)
    min : int or float  — minutes (0–59)
    sec : int or float  — seconds (0–59)

    Returns
    -------
    float — decimal degrees

    Examples
    --------
    >>> dms_to_dd(45, 30, 0)
    45.5
    >>> dms_to_dd(123, 45, 30)
    123.75833333333334
    """
    return abs(float(deg)) + float(min) / 60.0 + float(sec) / 3600.0


def dd_to_dms(dd: float) -> tuple[int, int, int]:
    """
    Convert decimal degrees to (degrees, minutes, seconds).
    Seconds are rounded to the nearest whole second.
    Input is normalised to 0–360° before conversion.

    Parameters
    ----------
    dd : float — decimal degrees (any value, normalised internally)

    Returns
    -------
    tuple[int, int, int] — (degrees, minutes, seconds)

    Examples
    --------
    >>> dd_to_dms(45.5)
    (45, 30, 0)
    >>> dd_to_dms(360.0)
    (0, 0, 0)
    """
    dd = ((float(dd) % 360) + 360) % 360
    d  = int(dd)
    mf = (dd - d) * 60.0
    m  = int(mf)
    s  = round((mf - m) * 60.0)
    # carry-over
    if s >= 60:
        s  = 0
        m += 1
    if m >= 60:
        m  = 0
        d += 1
    return d, m, s


def fmt_bearing(dd: float) -> str:
    """
    Format a decimal-degree WCB as a DMS string: DDD°MM'SS"

    Parameters
    ----------
    dd : float — bearing in decimal degrees

    Returns
    -------
    str — e.g. "045°30'00\""

    Examples
    --------
    >>> fmt_bearing(45.5)
    "045°30'00\""
    """
    d, m, s = dd_to_dms(dd)
    return f"{d:03d}\u00b0{m:02d}'{s:02d}\""


def bearing_between(
    from_e: float, from_n: float,
    to_e:   float, to_n:   float,
) -> float:
    """
    Compute the whole-circle bearing (WCB) from one coordinate to another.

    Parameters
    ----------
    from_e, from_n : float — origin point (MGA or local grid)
    to_e,   to_n   : float — target point

    Returns
    -------
    float — bearing in decimal degrees (0 ≤ b < 360)

    Examples
    --------
    >>> bearing_between(1000.0, 1000.0, 1100.0, 1100.0)
    45.0
    """
    de = to_e - from_e
    dn = to_n - from_n
    b  = math.degrees(math.atan2(de, dn))
    return (b % 360 + 360) % 360
