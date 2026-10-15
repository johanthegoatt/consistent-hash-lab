import { murmur3 } from "./hash.js";

// Karger et al., "Consistent Hashing and Random Trees", STOC 1997.
// Each node owns `vnodes` points on a 32-bit circle; a key belongs to the
// first point clockwise from its own hash.
export function createRing({ vnodes = 100, hash = murmur3 } = {}) {
  let points = []; // sorted [{ at, node }]
  const nodes = new Set();
  // A node's weight scales its vnode count, and so its share of keys. Weight
  // 2 is a machine with twice the memory; 0.5 one being drained gently.
  const weights = new Map();

  function rebuild() {
    points = [];
    for (const node of nodes) {
      const count = Math.max(1, Math.round(vnodes * (weights.get(node) ?? 1)));
      for (let v = 0; v < count; v++) points.push({ at: hash(`${node}#${v}`), node });
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
    add(node, { weight = 1 } = {}) {
      if (!(weight > 0)) throw new RangeError("weight must be positive");
      nodes.add(String(node));
      weights.set(String(node), weight);
      rebuild();
      return this;
    },
    remove(node) { nodes.delete(String(node)); weights.delete(String(node)); rebuild(); return this; },
    get nodes() { return [...nodes]; },
    get points() { return points; },
    successor,
    lookup(key) {
      if (!points.length) throw new Error("ring is empty");
      return points[successor(hash(String(key)))].node;
    },
    // Dynamo's preference list (DeCandia et al., SOSP 2007): walk clockwise
    // and take the first `count` distinct nodes, skipping further vnodes of
    // a node already chosen, so replicas never share a machine.
    lookupN(key, count) {
      if (!points.length) throw new Error("ring is empty");
      const want = Math.min(count, nodes.size);
      const chosen = [];
      let i = successor(hash(String(key)));
      while (chosen.length < want) {
        const node = points[i].node;
        if (!chosen.includes(node)) chosen.push(node);
        i = (i + 1) % points.length;
      }
      return chosen;
    },
  };
}
