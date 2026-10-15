import { test } from "node:test";
import assert from "node:assert/strict";
import { createMaglev } from "../src/maglev.js";

const nodes = (n) => Array.from({ length: n }, (_, i) => `node-${i}`);
const keys = Array.from({ length: 20_000 }, (_, i) => `key:${i}`);

test("every node owns floor or ceil of size / n slots", () => {
  const m = createMaglev(nodes(7), { size: 5003 });
  const counts = new Array(7).fill(0);
  for (const owner of m.table) counts[owner]++;
  for (const c of counts) assert.ok(c === Math.floor(5003 / 7) || c === Math.ceil(5003 / 7), `count ${c}`);
});

test("a join moves close to the ideal share, with little churn between old nodes", () => {
  const before = createMaglev(nodes(10), { size: 5003 });
  const after = createMaglev(nodes(11), { size: 5003 });
  let moved = 0, cross = 0;
  for (const k of keys) {
    const a = before.lookup(k), b = after.lookup(k);
    if (a !== b) moved++;
    if (a !== b && b !== "node-10") cross++;
  }
  assert.ok(moved / keys.length < 0.15, `moved ${moved / keys.length}`);
  assert.ok(cross / keys.length < 0.06, `cross ${cross / keys.length}`);
});

test("the table does not depend on the order nodes are listed", () => {
  const a = createMaglev(["x", "y", "z"], { size: 101 });
  const b = createMaglev(["z", "x", "y"], { size: 101 });
  assert.deepEqual([...a.table].map((i) => a.nodes[i]), [...b.table].map((i) => b.nodes[i]));
});

test("a size that is not prime is refused", () => {
  assert.throws(() => createMaglev(["a"], { size: 100 }), RangeError);
});
