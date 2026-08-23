#!/usr/bin/env python3
"""Hornea OSM local a src/world/data/bogota.json. Cero red."""
from __future__ import annotations

import json
import math
from pathlib import Path

# Casa de Nariño (Presidencia) — centroid OSM del predio.
ORIGIN_LAT = 4.595431788
ORIGIN_LON = -74.077518412
SCALE = 6.0  # unidades por metro
M_LAT = 111132.954
M_LON = 111132.954 * math.cos(math.radians(ORIGIN_LAT))

SOUTH, WEST, NORTH, EAST = 4.5865, -74.0895, 4.6145, -74.0610

ALIASES = {
    "Avenida Carrera 7": "Carrera Séptima",
    "Avenida Carrera 10": "Carrera 10",
    "Avenida Carrera 3": "Carrera 3",
    "Avenida Carrera 5": "Carrera 5",
    "Avenida Carrera 13": "Carrera 13",
    "Avenida Carrera 27": "Carrera 27",
    "Avenida Calle 26": "Calle 26",
    "Avenida Calle 19": "Calle 19",
    "Avenida Calle 13": "Calle 13",
    "Avenida Calle 7": "Calle 7",
    "Avenida Calle 6": "Calle 6",
    "Avenida Jiménez": "Jiménez",
    "Avenida Jiménez de Quesada": "Jiménez",
}

# Estaciones TM del recorte (OSM las etiqueta mal; coords oficiales / Wikipedia).
TM_STATIONS = [
    ("Bicentenario", 4.59363, -74.08147),
    ("Tercer Milenio", 4.59655, -74.08215),
    ("San Victorino", 4.60275, -74.08155),
    ("Av. Jiménez", 4.59905, -74.07885),
    ("Museo del Oro", 4.60185, -74.07255),
    ("Las Aguas", 4.60135, -74.06795),
    ("Universidades", 4.60175, -74.06515),
    ("Calle 19", 4.60585, -74.08190),
    ("Calle 22", 4.60905, -74.08230),
]


def xy(lat: float, lon: float) -> tuple[int, int]:
    x = (lon - WEST) * M_LON * SCALE
    y = (NORTH - lat) * M_LAT * SCALE
    return int(round(x)), int(round(y))


def perp_dist(p, a, b) -> float:
    ax, ay = a
    bx, by = b
    px, py = p
    dx, dy = bx - ax, by - ay
    den = dx * dx + dy * dy
    if den < 1e-9:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / den))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(pts: list[tuple[int, int]], tol: float) -> list[tuple[int, int]]:
    if len(pts) < 3:
        return pts
    max_d, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        d = perp_dist(pts[i], pts[0], pts[-1])
        if d > max_d:
            max_d, idx = d, i
    if max_d > tol:
        left = simplify(pts[: idx + 1], tol)
        right = simplify(pts[idx:], tol)
        return left[:-1] + right
    return [pts[0], pts[-1]]


def offset_poly(pts: list[tuple[int, int]], dist: float) -> list[tuple[int, int]]:
    if len(pts) < 2:
        return pts
    out = []
    for i, (x, y) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == len(pts) - 1:
            dx, dy = x - pts[i - 1][0], y - pts[i - 1][1]
        else:
            dx, dy = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
        L = math.hypot(dx, dy) or 1
        out.append((int(round(x + (-dy / L) * dist)), int(round(y + (dx / L) * dist))))
    return out


def kind_of(tags: dict) -> str | None:
    hw = tags.get("highway") or ""
    name = tags.get("name") or ""
    if name == "TransMilenio" or hw == "busway" or tags.get("bus") == "designated":
        return "tm"
    if hw == "cycleway" or tags.get("bicycle") == "designated":
        return "cycle"
    if hw in {
        "motorway",
        "trunk",
        "primary",
        "secondary",
        "tertiary",
        "unclassified",
        "residential",
        "living_street",
    }:
        return "road"
    if hw == "service" and tags.get("service") not in {"parking_aisle", "parking", "driveway"}:
        if "TransMilenio" in name:
            return "tm"
        return None
    return None


LANE_M = 3.25


def lane_counts(kind: str, tags: dict) -> tuple[int, int]:
    try:
        total = int(str(tags.get("lanes", "2")).split(";")[0])
    except ValueError:
        total = 2
    total = max(1, min(total, 6))
    oneway = tags.get("oneway") in {"yes", "true", "1"}
    if kind == "tm":
        return (1, 0) if oneway else (1, 1)
    if kind == "cycle":
        return (1, 0) if oneway else (1, 1)
    if oneway:
        return (total, 0)
    fwd = max(1, total // 2)
    return (fwd, max(1, total - fwd))


def width_of(kind: str, tags: dict) -> int:
    fwd, back = lane_counts(kind, tags)
    return int(max(1, fwd + back) * LANE_M * SCALE)


def geom_pts(el: dict) -> list[tuple[int, int]]:
    pts = []
    for p in el.get("geometry") or []:
        if SOUTH <= p["lat"] <= NORTH and WEST <= p["lon"] <= EAST:
            pts.append(xy(p["lat"], p["lon"]))
    return pts


def pack(pts: list[tuple[int, int]]) -> list[int]:
    flat = []
    for x, y in pts:
        flat.extend((x, y))
    return flat


def load_elements() -> list[dict]:
    root = Path(__file__).resolve().parent
    candidates = [
        root / "osm" / "centro.json",
        Path("/tmp/trancon-map/centro.json"),
        Path("/tmp/trancon-map/roads.json"),
    ]
    for p in candidates:
        if p.exists() and p.name.endswith("centro.json"):
            return json.loads(p.read_text())["elements"]
    els = []
    tmp = Path("/tmp/trancon-map")
    for name in ("roads.json", "special.json"):
        p = tmp / name
        if p.exists():
            els.extend(json.loads(p.read_text())["elements"])
    if not els:
        raise SystemExit("no OSM extract found (tools/osm/centro.json or /tmp/trancon-map)")
    return els


def park_from_way(el: dict) -> dict | None:
    tags = el.get("tags") or {}
    name = tags.get("name")
    if not name:
        return None
    pts = geom_pts(el)
    if len(pts) < 3:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    if w < 48 or h < 48:
        return None
    return {
        "id": f"park-{el['id']}",
        "name": name,
        "x": (min(xs) + max(xs)) // 2,
        "y": (min(ys) + max(ys)) // 2,
        "w": w,
        "h": h,
    }


def palace_from_way(el: dict) -> dict | None:
    tags = el.get("tags") or {}
    name = tags.get("name") or ""
    if "Casa de Nariño" not in name:
        return None
    pts = geom_pts(el)
    if len(pts) < 3:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {
        "id": "casa-narino",
        "name": "Casa de Nariño",
        "kind": "palace",
        "x": (min(xs) + max(xs)) // 2,
        "y": (min(ys) + max(ys)) // 2,
        "w": max(80, max(xs) - min(xs)),
        "h": max(80, max(ys) - min(ys)),
    }


def main() -> None:
    els = load_elements()
    ways = []
    parks = []
    palace = None
    seen = set()
    for el in els:
        tags = el.get("tags") or {}
        if el.get("type") == "way" and tags.get("leisure") == "park":
            park = park_from_way(el)
            if park:
                parks.append(park)
        if el.get("type") == "way" and palace is None:
            palace = palace_from_way(el)
        if el.get("type") != "way":
            continue
        kind = kind_of(tags)
        if not kind:
            continue
        pts = geom_pts(el)
        if len(pts) < 2:
            continue
        tol = 2 * SCALE if kind in {"tm", "cycle"} else (2 * SCALE if tags.get("highway") in {"trunk", "primary"} else 4 * SCALE)
        pts = simplify(pts, tol)
        key = (kind, tuple(pts[:2]), tuple(pts[-2:]), tags.get("name"))
        if key in seen:
            continue
        seen.add(key)
        name = ALIASES.get(tags.get("name") or "", tags.get("name") or "")
        fwd, back = lane_counts(kind, tags)
        oneway = tags.get("oneway") in {"yes", "true", "1"}
        lane_w = int(LANE_M * SCALE)
        ways.append(
            {
                "id": f"{kind}-{el['id']}",
                "name": name,
                "kind": kind,
                "w": width_of(kind, tags),
                "laneW": lane_w,
                "lanesF": fwd,
                "lanesB": back,
                "oneway": oneway,
                "pts": pack(pts),
            }
        )
        if kind == "road" and tags.get("busway:right") == "lane":
            tm_pts = offset_poly(pts, width_of("road", tags) * 0.22)
            ways.append(
                {
                    "id": f"tm-off-{el['id']}",
                    "name": "TransMilenio",
                    "kind": "tm",
                    "w": lane_w,
                    "laneW": lane_w,
                    "lanesF": 1,
                    "lanesB": 0,
                    "oneway": True,
                    "pts": pack(tm_pts),
                }
            )
        if kind == "road" and tags.get("cycleway:right") == "shared_lane":
            cy = offset_poly(pts, width_of("road", tags) * 0.42)
            ways.append(
                {
                    "id": f"cycle-off-{el['id']}",
                    "name": name,
                    "kind": "cycle",
                    "w": int(2.2 * SCALE),
                    "laneW": int(2.2 * SCALE),
                    "lanesF": 1,
                    "lanesB": 0,
                    "oneway": True,
                    "pts": pack(cy),
                }
            )

    def snap_to_tm(x: int, y: int, max_d: float = 900.0) -> tuple[int, int]:
        best_d = max_d
        best = (x, y)
        for w in ways:
            if w["kind"] != "tm":
                continue
            pts = list(zip(w["pts"][::2], w["pts"][1::2]))
            for i in range(len(pts) - 1):
                ax, ay = pts[i]
                bx, by = pts[i + 1]
                dx, dy = bx - ax, by - ay
                den = dx * dx + dy * dy or 1
                t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / den))
                px, py = ax + dx * t, ay + dy * t
                d = math.hypot(x - px, y - py)
                if d < best_d:
                    best_d = d
                    best = (int(px), int(py))
        return best

    spawn = xy(ORIGIN_LAT, ORIGIN_LON)
    se = xy(SOUTH, EAST)
    plaza = xy(4.59808, -74.07598)
    parks.append(
        {
            "id": "plaza-bolivar",
            "name": "Plaza de Bolívar",
            "x": plaza[0],
            "y": plaza[1],
            "w": int(90 * SCALE),
            "h": int(90 * SCALE),
        }
    )
    stations = []
    for i, (name, lat, lon) in enumerate(TM_STATIONS):
        if not (SOUTH <= lat <= NORTH and WEST <= lon <= EAST):
            continue
        x, y = snap_to_tm(*xy(lat, lon))
        stations.append({"id": f"tm-{i}", "name": name, "x": x, "y": y})
    if palace is None:
        palace = {
            "id": "casa-narino",
            "name": "Casa de Nariño",
            "kind": "palace",
            "x": spawn[0],
            "y": spawn[1],
            "w": int(85 * SCALE),
            "h": int(98 * SCALE),
        }
    data = {
        "meta": {
            "title": "Centro / Casa de Nariño",
            "spawn": {"x": spawn[0], "y": spawn[1], "heading": -math.pi / 2},
            "width": se[0],
            "height": se[1],
            "scale": SCALE,
            "origin": {
                "name": "Casa de Nariño",
                "address": "Carrera 8 #7-26",
                "lat": ORIGIN_LAT,
                "lon": ORIGIN_LON,
            },
        },
        "ways": ways,
        "parks": parks,
        "stations": stations,
        "landmarks": [palace, {"id": "plaza-bolivar", "name": "Plaza de Bolívar", "x": plaza[0], "y": plaza[1]}],
    }
    out = Path(__file__).resolve().parents[1] / "src" / "world" / "data" / "bogota.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = {}
    for w in ways:
        counts[w["kind"]] = counts.get(w["kind"], 0) + 1
    print(f"wrote {out} ways={len(ways)} {counts} stations={len(stations)} parks={len(parks)} spawn={spawn} size={out.stat().st_size}")


if __name__ == "__main__":
    main()
