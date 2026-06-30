# Survey COGO — Survey Misclose Dashboard

**COGO (Coordinate Geometry) tools for professional surveyors — Treasco Surveyors, Sydney NSW**

This repository contains two versions of the same surveying computation engine:

| Version | Description | Location |
|---------|-------------|----------|
| **Web App** | Interactive mobile-first browser dashboard | [`webapp/`](./webapp/) |
| **Python CLI** | Command-line tool and importable library | [`survey_cogo/`](./survey_cogo/) |

All bearings are **Whole-Circle Bearings (WCB)** in degrees-minutes-seconds, measured clockwise from north — the standard Australian surveying convention.

---

## Features

| Module | Web App | Python CLI |
|--------|---------|------------|
| **Traverse** | Misclose (ΣΔE, ΣΔN, linear misclose, direction) and precision ratio | ✅ | ✅ |
| **Join** | WCB bearing and distance between coordinate pairs, SVG diagram, scale factor | ✅ | ✅ |
| **Radiation** | Compute coordinates from setup station using bearing + distance | ✅ | ✅ |
| **Conversions** | Length (m ↔ links ↔ chains ↔ feet) and Area (ha ↔ m² ↔ acres ↔ A–R–P) | ✅ | ✅ |

---

## Repository Structure

```
Survey-Misclose-Dashboard/
│
├── survey_cogo/              ← Python computation engine (backend logic)
│   ├── __init__.py           ← Public API exports
│   ├── __main__.py           ← Entry point for `python -m survey_cogo`
│   ├── bearings.py           ← DMS ↔ DD conversion, WCB bearing between points
│   ├── traverse.py           ← Misclose and precision ratio
│   ├── join.py               ← Bearing, distance, scale factor
│   ├── radiation.py          ← Polar coordinate computation
│   ├── conversions.py        ← Length and area unit conversions
│   └── cli.py                ← Interactive terminal menu
│
├── webapp/                   ← React/TypeScript web dashboard (frontend)
│   ├── client/               ← Frontend source (React + Tailwind + shadcn/ui)
│   │   ├── src/
│   │   │   ├── App.tsx       ← 4-tab navigation shell
│   │   │   ├── pages/        ← TraversePage, JoinPage, ConversionsPage, RadiationPage
│   │   │   └── lib/          ← Computation logic (traverse.ts, join.ts)
│   │   └── index.html
│   ├── server/               ← Express backend (serves static app + API)
│   ├── shared/               ← Shared TypeScript schema (Drizzle ORM)
│   ├── package.json
│   └── vite.config.ts
│
├── examples/                 ← Python usage examples
│   ├── traverse_example.py
│   ├── join_example.py
│   ├── radiation_example.py
│   └── conversions_example.py
│
├── tests/
│   └── test_survey_cogo.py   ← 36 unit tests (all passing)
│
├── requirements.txt          ← No external dependencies (Python 3.10+ stdlib only)
├── LICENSE                   ← MIT
└── README.md
```

---

## Option A — Run the Web App

The web dashboard runs in any browser and is optimised for mobile use on site.

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Install and Start

```bash
cd webapp
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Build for Production

```bash
cd webapp
npm run build
npm start
```

### Live Hosted Version

The web app is deployed at:

> **https://www.perplexity.ai/computer/a/survey-cogo-XIZJy6_NT_OGHgRMfCdOtw**

No installation required — open this link on any phone or desktop browser.

---

## Option B — Run the Python CLI

The command-line tool provides the same calculations through an interactive terminal menu. No external packages required.

### Prerequisites

- Python 3.10 or later

### Run the Interactive Menu

```bash
# From the repository root:
python -m survey_cogo
```

You will see a menu like:

```
Survey COGO — Treasco Surveyors
================================
1. Traverse misclose & precision
2. Join (bearing & distance)
3. Radiation (polar coordinates)
4. Unit conversions
5. Exit
```

### Run the Demo

```bash
python -m survey_cogo --demo
```

### Use as a Python Library

Import individual modules into your own scripts:

```python
from survey_cogo import (
    # Bearings
    dms_to_dd, dd_to_dms, fmt_bearing, bearing_between,
    # Traverse
    compute_traverse, print_traverse,
    # Join
    compute_joins, print_joins,
    # Radiation
    radiate, compute_radiation, print_radiation,
    # Conversions
    convert_length, convert_area, print_length, print_area,
)

# Example: compute a traverse
legs = [
    {"bearing": (45, 30, 0), "distance": 123.456},
    {"bearing": (135, 15, 0), "distance": 98.765},
    {"bearing": (225, 45, 0), "distance": 110.234},
    {"bearing": (315, 0, 0), "distance": 115.000},
]
result = compute_traverse(legs)
print_traverse(result)
```

See the [`examples/`](./examples/) folder for more usage patterns.

### Run the Unit Tests

```bash
python tests/test_survey_cogo.py
```

All 36 tests pass against the stdlib `unittest` runner — no pytest required.

---

## Computation Reference

### Bearings (WCB)

All bearings are Whole-Circle Bearings in DDD°MM'SS" format, clockwise from north.

```python
from survey_cogo import dms_to_dd, dd_to_dms, fmt_bearing

dd = dms_to_dd(45, 30, 15)        # → 45.504167
dms = dd_to_dms(45.504167)        # → (45, 30, 15)
label = fmt_bearing(45, 30, 15)   # → "45°30'15\""
```

### Traverse Misclose

```python
from survey_cogo import compute_traverse

result = compute_traverse(legs)
# result keys: sum_de, sum_dn, linear_misclose, direction, precision
# precision is 1:X — e.g. precision=5000 means 1:5000
```

### Join

```python
from survey_cogo import compute_joins

points = [
    {"label": "A", "e": 1000.000, "n": 2000.000},
    {"label": "B", "e": 1123.456, "n": 2098.765},
]
results = compute_joins(points, scale_factor=0.99972)
# results[0] keys: from_label, to_label, bearing (DMS), distance, ground_distance
```

### Radiation

```python
from survey_cogo import radiate

coord = radiate(
    setup_e=1000.0, setup_n=2000.0,
    bearing_dms=(90, 0, 0),   # Due east
    distance=50.0
)
# coord = {"e": 1050.0, "n": 2000.0}
```

### Conversions

```python
from survey_cogo import convert_length, convert_area

metres = convert_length(10, from_unit="links", to_unit="metres")  # → 2.01168
ha = convert_area(1, from_unit="acres", to_unit="ha")             # → 0.404686
```

**Key constants used:**
- 1 link = 0.201168 m (Gunter's chain)
- 1 chain = 20.1168 m = 100 links = 66 ft
- 1 foot = 0.3048 m (international)
- 1 acre = 4046.8564224 m² = 4 roods = 160 perches

---

## Making a Windows Executable

To distribute the CLI as a standalone `.exe` (no Python required on the target machine):

```cmd
pip install pyinstaller
pyinstaller --onedir --console --name SurveyCOGO --icon=icon.ico survey_cogo/__main__.py
```

The built app will be in `dist/SurveyCOGO/`. Zip and distribute. See [PyInstaller docs](https://pyinstaller.org/en/stable/) for details.

---

## Licence

MIT — see [LICENSE](./LICENSE)

**Treasco Surveyors** · Sydney, NSW, Australia
