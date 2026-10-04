// MurmurHash3 x86_32 (Austin Appleby, public domain) over the UTF-8 bytes of a string.
const enc = new TextEncoder();
let scratch = new Uint8Array(256);

// Encode into a reused buffer: rendezvous hashes n strings per key, and a fresh
// Uint8Array per call was most of its cost.
function utf8(str) {
  if (str.length * 3 > scratch.length) scratch = new Uint8Array(str.length * 3);
  return scratch.subarray(0, enc.encodeInto(str, scratch).written);
}

export function murmur3(input, seed = 0) {
  const bytes = typeof input === "string" ? utf8(input) : input;
  const len = bytes.length;
  const nblocks = len >>> 2;
  let h = seed >>> 0;
  const c1 = 0xcc9e2d51, c2 = 0x1b873593;
  for (let i = 0; i < nblocks; i++) {
    const o = i * 4;
    let k = bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24);
    k = Math.imul(k, c1); k = (k << 15) | (k >>> 17); k = Math.imul(k, c2);
    h ^= k; h = (h << 13) | (h >>> 19); h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  let k = 0;
  const tail = nblocks * 4;
  switch (len & 3) {
    case 3: k ^= bytes[tail + 2] << 16; // falls through
    case 2: k ^= bytes[tail + 1] << 8;  // falls through
    case 1:
      k ^= bytes[tail];
      k = Math.imul(k, c1); k = (k << 15) | (k >>> 17); k = Math.imul(k, c2);
      h ^= k;
  }
  h ^= len;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// 64-bit key for jump hash: two independent 32-bit halves.
export function hash64(input) {
  return (BigInt(murmur3(input, 0x9747b28c)) << 32n) | BigInt(murmur3(input, 0));
}
