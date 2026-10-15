import { murmur3 } from "./hash.js";

// Eisenbud et al., "Maglev: A Fast and Reliable Software Network Load
// Balancer", NSDI 2016, section 3.4. Each node gets a permutation of the
// table slots from two hashes of its name (offset and skip), then the nodes
// take turns claiming their next preferred free slot until the table is
// full. A lookup is one array index. Every node ends up with floor or ceil
// of size / n slots, and a join moves a few keys between existing nodes,
// the price paid for that evenness.
export function createMaglev(nodes, { size = 65537, hash = murmur3 } = {}) {
  if (!nodes.length) throw new Error("no nodes");
  if (!isPrime(size)) throw new RangeError("table size must be prime so every skip visits every slot");
  const names = [...nodes].map(String).sort();
  const offset = names.map((n) => hash(n, 0xdeadbeef) % size);
  const skip = names.map((n) => (hash(n, 0x5bd1e995) % (size - 1)) + 1);
  const next = new Array(names.length).fill(0);
  const table = new Int32Array(size).fill(-1);

  let filled = 0;
  while (filled < size) {
    for (let i = 0; i < names.length && filled < size; i++) {
      let slot = (offset[i] + next[i] * skip[i]) % size;
      while (table[slot] >= 0) {
        next[i]++;
        slot = (offset[i] + next[i] * skip[i]) % size;
      }
      table[slot] = i;
      next[i]++;
      filled++;
    }
  }

  return {
    nodes: names,
    table,
    lookup(key) {
      return names[table[hash(String(key)) % size]];
    },
  };
}

function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
