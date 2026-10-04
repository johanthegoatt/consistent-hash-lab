import { test } from "node:test";
import assert from "node:assert/strict";
import { jumpHash } from "../src/jump.js";

const keys = Array.from({ length: 20_000 }, (_, i) => `key:${i}`);

test("jump hash with one bucket is always 0", () => {
  for (const k of [0n, 1n, 0xdeadbeefn, (1n << 64n) - 1n]) assert.equal(jumpHash(k, 1), 0);
});

test("jump hash is monotone: growing n only moves keys to the new bucket", () => {
  for (let n = 1; n < 40; n++) {
    for (const k of keys.slice(0, 2000)) {
      const a = jumpHash(k, n), b = jumpHash(k, n + 1);
      if (a !== b) assert.equal(b, n);
    }
  }
});

test("jump hash moves about 1/(n+1) of keys and spreads evenly", () => {
  const n = 10;
  let moved = 0;
  const load = new Array(n + 1).fill(0);
  for (const k of keys) {
    const b = jumpHash(k, n + 1);
    load[b]++;
    if (jumpHash(k, n) !== b) moved++;
  }
  assert.ok(Math.abs(moved / keys.length - 1 / 11) < 0.01, `moved ${moved}`);
  const mean = keys.length / (n + 1);
  assert.ok(Math.max(...load) / mean < 1.06);
});

