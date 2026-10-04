import { hash64 } from "./hash.js";

const MASK = (1n << 64n) - 1n;

// Lamping and Veach, "A Fast, Minimal Memory, Consistent Hash Algorithm", 2014.
// No ring and no memory: the key seeds a 64-bit LCG and jumps forward through
// bucket numbers. Buckets are 0..n-1, so only the last one can be removed.
export function jumpHash(key, buckets) {
  if (!(buckets >= 1)) throw new RangeError("buckets must be >= 1");
  let k = typeof key === "bigint" ? key & MASK : hash64(String(key));
  let b = -1, j = 0;
  while (j < buckets) {
    b = j;
    k = (k * 2862933555777941757n + 1n) & MASK;
    j = Math.floor((b + 1) * (2 ** 31 / (Number(k >> 33n) + 1)));
  }
  return b;
}
