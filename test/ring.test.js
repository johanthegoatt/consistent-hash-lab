import { test } from "node:test";
import assert from "node:assert/strict";
import { murmur3 } from "../src/hash.js";
import { createRing } from "../src/ring.js";

test("murmur3 matches the reference x86_32 vectors", () => {
  assert.equal(murmur3("", 0), 0);
  assert.equal(murmur3("", 1), 0x514e28b7);
  assert.equal(murmur3("hello", 0), 0x248bfa47);
  assert.equal(murmur3("The quick brown fox jumps over the lazy dog", 0), 0x2e4ff723);
});

const keys = Array.from({ length: 20_000 }, (_, i) => `key:${i}`);

test("adding a node only moves keys onto that node", () => {
  const ring = createRing({ vnodes: 100 });
  for (let n = 0; n < 8; n++) ring.add(`n${n}`);
  const before = keys.map((k) => ring.lookup(k));
  ring.add("n8");
  let moved = 0;
  keys.forEach((k, i) => {
    const now = ring.lookup(k);
    if (now !== before[i]) { moved++; assert.equal(now, "n8"); }
  });
  // Ideal is 1/9 of keys; vnodes keep it close.
  assert.ok(Math.abs(moved / keys.length - 1 / 9) < 0.04, `moved ${moved}`);
});

test("removing a node only moves that node's keys", () => {
  const ring = createRing({ vnodes: 100 });
  for (let n = 0; n < 8; n++) ring.add(`n${n}`);
  const before = keys.map((k) => ring.lookup(k));
  ring.remove("n3");
  keys.forEach((k, i) => {
    if (before[i] !== "n3") assert.equal(ring.lookup(k), before[i]);
  });
});

test("more vnodes means a flatter load", () => {
  const spread = (vnodes) => {
    const ring = createRing({ vnodes });
    for (let n = 0; n < 10; n++) ring.add(`n${n}`);
    const load = {};
    for (const k of keys) { const n = ring.lookup(k); load[n] = (load[n] || 0) + 1; }
    return Math.max(...Object.values(load)) / (keys.length / 10);
  };
  assert.ok(spread(200) < spread(1));
  assert.ok(spread(200) < 1.25);
});
