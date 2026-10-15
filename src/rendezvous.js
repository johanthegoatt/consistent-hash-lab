import { murmur3 } from "./hash.js";

// Thaler and Ravishankar, "Using Name-Based Mappings to Increase Hit Rates",
// IEEE/ACM ToN 1998 (highest random weight). Every node scores every key; the
// top score wins. Weights use the logarithmic method, score = -w / ln(u),
// which gives node i a w_i / sum(w) share of keys (Resch, "New hashing
// algorithms for data storage", 2015).
function score(key, node, weights, hash) {
  const u = (hash(`${node}:${key}`) + 0.5) / 4294967296; // (0, 1)
  const w = weights ? weights[node] ?? 1 : 1;
  return -w / Math.log(u);
}

export function rendezvous(key, nodes, { weights, hash = murmur3 } = {}) {
  if (!nodes.length) throw new Error("no nodes");
  let best = null, bestScore = -Infinity;
  for (const node of nodes) {
    const s = score(key, node, weights, hash);
    if (s > bestScore || (s === bestScore && node < best)) { best = node; bestScore = s; }
  }
  return best;
}

// The top `count` scorers, best first: replica placement for free. When a
// node leaves, each key's list only loses that node and gains the next one.
export function rendezvousN(key, nodes, count, { weights, hash = murmur3 } = {}) {
  if (!nodes.length) throw new Error("no nodes");
  return nodes
    .map((node) => ({ node, s: score(key, node, weights, hash) }))
    .sort((a, b) => b.s - a.s || (a.node < b.node ? -1 : 1))
    .slice(0, count)
    .map((entry) => entry.node);
}
