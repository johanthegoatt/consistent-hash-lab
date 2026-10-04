import { test } from "node:test";
import assert from "node:assert/strict";
import { rendezvous } from "../src/rendezvous.js";

const keys = Array.from({ length: 20_000 }, (_, i) => `key:${i}`);

test("rendezvous: removing a node only moves that node's keys", () => {
  const nodes = Array.from({ length: 8 }, (_, i) => `n${i}`);
  const fewer = nodes.filter((n) => n !== "n5");
  for (const k of keys.slice(0, 5000)) {
    const a = rendezvous(k, nodes);
    if (a !== "n5") assert.equal(rendezvous(k, fewer), a);
  }
});

test("rendezvous weights split keys in proportion", () => {
  const nodes = ["a", "b", "c"];
  const weights = { a: 1, b: 2, c: 1 };
  const load = { a: 0, b: 0, c: 0 };
  for (const k of keys) load[rendezvous(k, nodes, { weights })]++;
  assert.ok(Math.abs(load.b / keys.length - 0.5) < 0.02, JSON.stringify(load));
});
