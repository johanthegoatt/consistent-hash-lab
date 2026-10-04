import { murmur3 } from "./hash.js";

// Thaler and Ravishankar, "Using Name-Based Mappings to Increase Hit Rates",
// IEEE/ACM ToN 1998 (highest random weight). Every node scores every key; the
// top score wins. Weights use the logarithmic method, score = -w / ln(u),
// which gives node i a w_i / sum(w) share of keys (Resch, "New hashing
// algorithms for data storage", 2015).
export function rendezvous(key, nodes, { weights, hash = murmur3 } = {}) {
  if (!nodes.length) throw new Error("no nodes");
  let best = null, bestScore = -Infinity;
  for (const node of nodes) {
    const u = (hash(`${node}:${key}`) + 0.5) / 4294967296; // (0, 1)
    const w = weights ? weights[node] ?? 1 : 1;
    const score = -w / Math.log(u);
    if (score > bestScore || (score === bestScore && node < best)) { best = node; bestScore = score; }
  }
  return best;
}
