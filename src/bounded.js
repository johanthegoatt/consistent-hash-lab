import { murmur3 } from "./hash.js";

// Mirrokni, Thorup and Zadimoghaddam, "Consistent Hashing with Bounded Loads",
// SODA 2018. Keys are placed one at a time; no node may hold more than
// ceil((1 + eps) * m / n) of the m keys placed so far. A key whose ring
// successor is full walks clockwise to the next node with room.
export function assignBounded(keys, ring, { eps = 0.25, hash = murmur3 } = {}) {
  const n = ring.nodes.length;
  if (!n) throw new Error("ring is empty");
  const points = ring.points;
  const load = Object.fromEntries(ring.nodes.map((node) => [node, 0]));
  const owner = new Array(keys.length);
  let walked = 0;
  keys.forEach((key, m) => {
    const cap = Math.ceil(((1 + eps) * (m + 1)) / n);
    let i = ring.successor(hash(String(key)));
    while (load[points[i].node] >= cap) { i = (i + 1) % points.length; walked++; }
    const node = points[i].node;
    load[node]++;
    owner[m] = node;
  });
  return { owner, load, walked };
}
