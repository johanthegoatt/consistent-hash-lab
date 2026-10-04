import { murmur3 } from "./hash.js";
import { createRing } from "./ring.js";
import { jumpHash } from "./jump.js";
import { rendezvous } from "./rendezvous.js";
import { assignBounded } from "./bounded.js";

export const SCHEMES = ["modulo", "ring", "jump", "rendezvous", "bounded"];

export const makeKeys = (count, seed = 1) =>
  Array.from({ length: count }, (_, i) => `s${seed}:user:${i}`);

const names = (n) => Array.from({ length: n }, (_, i) => `node-${i}`);

// Owner of every key, for one scheme and node count.
export function placeAll(scheme, keys, n, { vnodes = 100, eps = 0.25 } = {}) {
  const nodes = names(n);
  switch (scheme) {
    case "modulo": return keys.map((k) => nodes[murmur3(k) % n]);
    case "jump": return keys.map((k) => nodes[jumpHash(k, n)]);
    case "rendezvous": return keys.map((k) => rendezvous(k, nodes));
    case "ring": case "bounded": {
      const ring = createRing({ vnodes });
      nodes.forEach((x) => ring.add(x));
      return scheme === "ring" ? keys.map((k) => ring.lookup(k)) : assignBounded(keys, ring, { eps }).owner;
    }
    default: throw new Error(`unknown scheme ${scheme}`);
  }
}

function spread(owner, n) {
  const counts = Object.fromEntries(names(n).map((x) => [x, 0]));
  for (const o of owner) counts[o]++;
  const loads = Object.values(counts);
  const mean = owner.length / n;
  const sd = Math.sqrt(loads.reduce((s, l) => s + (l - mean) ** 2, 0) / n);
  return { loads, peakOverMean: Math.max(...loads) / mean, cv: sd / mean };
}

const movedShare = (a, b) => a.reduce((s, o, i) => s + (o !== b[i]), 0) / a.length;

// Load spread at n nodes, then the share of keys that change owner when one
// node joins (n -> n + 1). The ideal is 1 / (n + 1).
export function compare({ keys, nodes, vnodes = 100, eps = 0.25, schemes = SCHEMES }) {
  return schemes.map((scheme) => {
    const at = placeAll(scheme, keys, nodes, { vnodes, eps });
    const grown = placeAll(scheme, keys, nodes + 1, { vnodes, eps });
    return { scheme, ...spread(at, nodes), moved: movedShare(at, grown), ideal: 1 / (nodes + 1) };
  });
}
