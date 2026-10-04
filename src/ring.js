import { murmur3 } from "./hash.js";

// Karger et al., "Consistent Hashing and Random Trees", STOC 1997.
// Each node owns `vnodes` points on a 32-bit circle; a key belongs to the
// first point clockwise from its own hash.
export function createRing({ vnodes = 100, hash = murmur3 } = {}) {
  let points = []; // sorted [{ at, node }]
  const nodes = new Set();

  function rebuild() {
    points = [];
    for (const node of nodes) {
      for (let v = 0; v < vnodes; v++) points.push({ at: hash(`${node}#${v}`), node });
    }
    points.sort((a, b) => a.at - b.at || (a.node < b.node ? -1 : 1));
  }

  // First index whose point is >= h, wrapping to 0.
  function successor(h) {
    let lo = 0, hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (points[mid].at < h) lo = mid + 1; else hi = mid;
    }
    return lo === points.length ? 0 : lo;
  }

  return {
    add(node) { nodes.add(String(node)); rebuild(); return this; },
    remove(node) { nodes.delete(String(node)); rebuild(); return this; },
    get nodes() { return [...nodes]; },
    get points() { return points; },
    successor,
    lookup(key) {
      if (!points.length) throw new Error("ring is empty");
      return points[successor(hash(String(key)))].node;
    },
  };
}
