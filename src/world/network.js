const CELL = 140;

export function buildNetwork(map) {
  const ways = map.ways.map((way) => {
    const pts = [];
    for (let i = 0; i < way.pts.length; i += 2) pts.push({ x: way.pts[i], y: way.pts[i + 1] });
    const segs = [];
    let length = 0;
    const cum = [0];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      segs.push({ a, b, len, heading: Math.atan2(b.y - a.y, b.x - a.x) });
      length += len;
      cum.push(length);
    }
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of pts) {
      if (p.x < minx) minx = p.x;
      if (p.y < miny) miny = p.y;
      if (p.x > maxx) maxx = p.x;
      if (p.y > maxy) maxy = p.y;
    }
    return { ...way, pts, segs, length, cum, minx, miny, maxx, maxy };
  });

  const grid = new Map();
  const bump = (cx, cy, payload) => {
    const key = `${cx}:${cy}`;
    let bucket = grid.get(key);
    if (!bucket) { bucket = []; grid.set(key, bucket); }
    bucket.push(payload);
  };
  ways.forEach((way, wi) => {
    way.segs.forEach((seg, si) => {
      const x0 = Math.floor(Math.min(seg.a.x, seg.b.x) / CELL);
      const x1 = Math.floor(Math.max(seg.a.x, seg.b.x) / CELL);
      const y0 = Math.floor(Math.min(seg.a.y, seg.b.y) / CELL);
      const y1 = Math.floor(Math.max(seg.a.y, seg.b.y) / CELL);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) bump(cx, cy, { wi, si });
    });
  });

  const nodes = new Map();
  const snap = (p) => `${Math.round(p.x / 16) * 16}:${Math.round(p.y / 16) * 16}`;
  ways.forEach((way, wi) => {
    if (!way.pts.length) return;
    for (const p of [way.pts[0], way.pts[way.pts.length - 1]]) {
      const key = snap(p);
      let n = nodes.get(key);
      if (!n) { n = { x: p.x, y: p.y, ways: [] }; nodes.set(key, n); }
      n.ways.push(wi);
    }
  });

  function query(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const hits = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const bucket = grid.get(`${cx + dx}:${cy + dy}`);
      if (bucket) hits.push(...bucket);
    }
    return hits;
  }

  function projectOnSeg(x, y, seg) {
    const dx = seg.b.x - seg.a.x, dy = seg.b.y - seg.a.y;
    const den = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - seg.a.x) * dx + (y - seg.a.y) * dy) / den));
    const px = seg.a.x + dx * t, py = seg.a.y + dy * t;
    return { t, px, py, dist: Math.hypot(x - px, y - py), heading: seg.heading };
  }

  function nearest(x, y, kinds) {
    let best = null;
    const seen = new Set();
    for (const hit of query(x, y)) {
      const mark = hit.wi * 10000 + hit.si;
      if (seen.has(mark)) continue;
      seen.add(mark);
      const way = ways[hit.wi];
      if (kinds && !kinds.includes(way.kind)) continue;
      const proj = projectOnSeg(x, y, way.segs[hit.si]);
      if (!best || proj.dist < best.dist) best = { way, si: hit.si, ...proj };
    }
    return best;
  }

  function laneCount(way, dir) {
    const f = way.lanesF || 1;
    const b = way.lanesB ?? (way.oneway ? 0 : 1);
    return Math.max(1, dir > 0 ? f : (b || f));
  }

  function laneOffset(way, dir, lane) {
    const lw = way.laneW || 20;
    const i = Math.max(0, Math.min(laneCount(way, dir) - 1, lane | 0));
    if (way.oneway || !(way.lanesB > 0)) {
      const n = way.lanesF || 1;
      return (i - (n - 1) / 2) * lw;
    }
    return (dir > 0 ? 1 : -1) * (0.5 + i) * lw;
  }

  function pointAt(way, s, dir = 1, lane = 0) {
    const d = Math.max(0, Math.min(way.length, s));
    let i = 0;
    while (i < way.cum.length - 2 && way.cum[i + 1] < d) i++;
    const seg = way.segs[i];
    const local = d - way.cum[i];
    const t = local / seg.len;
    const heading = seg.heading;
    const x = seg.a.x + (seg.b.x - seg.a.x) * t;
    const y = seg.a.y + (seg.b.y - seg.a.y) * t;
    const nx = Math.cos(heading + Math.PI / 2);
    const ny = Math.sin(heading + Math.PI / 2);
    const off = laneOffset(way, dir, lane);
    return { x: x + nx * off, y: y + ny * off, heading, si: i, nx, ny, off };
  }

  function nextWay(way, atEnd) {
    const p = atEnd ? way.pts[way.pts.length - 1] : way.pts[0];
    const node = nodes.get(snap(p));
    if (!node) return null;
    const heading = atEnd ? way.segs[way.segs.length - 1].heading : way.segs[0].heading + Math.PI;
    let best = null, bestDot = -1;
    for (const wi of node.ways) {
      const other = ways[wi];
      if (other === way) continue;
      if (other.kind !== way.kind && !(way.kind === "road" && other.kind === "road")) continue;
      const start = other.pts[0], end = other.pts[other.pts.length - 1];
      const useStart = Math.hypot(start.x - p.x, start.y - p.y) < Math.hypot(end.x - p.x, end.y - p.y);
      if (other.oneway && !useStart) continue;
      const h = useStart ? other.segs[0].heading : other.segs[other.segs.length - 1].heading + Math.PI;
      const dot = Math.cos(h) * Math.cos(heading) + Math.sin(h) * Math.sin(heading);
      if (dot > bestDot) { bestDot = dot; best = { way: other, reverse: !useStart }; }
    }
    return best;
  }

  return {
    ways,
    map,
    nearest,
    pointAt,
    nextWay,
    isDriveable(x, y) {
      const hit = nearest(x, y, ["road"]);
      return hit && hit.dist < hit.way.w * 0.52 + 10;
    },
    isTmExclusive(x, y) {
      const hit = nearest(x, y, ["tm"]);
      return hit && hit.dist < hit.way.w * 0.48;
    },
    isCycleway(x, y) {
      const hit = nearest(x, y, ["cycle"]);
      return hit && hit.dist < hit.way.w * 0.7;
    },
    inBounds(x, y) {
      return x > -40 && y > -40 && x < map.meta.width + 40 && y < map.meta.height + 40;
    },
    pickWay(kind, index) {
      const list = ways.filter((w) => w.kind === kind && w.length > 80);
      return list[index % Math.max(1, list.length)] || ways[0];
    },
    laneCount,
    nearbyWays(x, y, kind, radius) {
      const r2 = radius * radius;
      return ways.filter((w) => {
        if (kind && w.kind !== kind) return false;
        const cx = (w.minx + w.maxx) / 2, cy = (w.miny + w.maxy) / 2;
        const dx = cx - x, dy = cy - y;
        return dx * dx + dy * dy < r2 && w.length > 50;
      });
    },
  };
}
