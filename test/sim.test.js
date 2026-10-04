import { test } from "node:test";
import assert from "node:assert/strict";
import { createRing } from "../src/ring.js";
import { assignBounded } from "../src/bounded.js";
import { compare, makeKeys } from "../src/sim.js";

test("bounded loads never exceed ceil((1 + eps) * m / n)", () => {
  const ring = createRing({ vnodes: 20 });
  for (let i = 0; i < 7; i++) ring.add(`n${i}`);
  const keys = makeKeys(10_000);
  for (const eps of [0.05, 0.25, 1]) {
    const { load } = assignBounded(keys, ring, { eps });
    const cap = Math.ceil(((1 + eps) * keys.length) / 7);
    assert.ok(Math.max(...Object.values(load)) <= cap, `eps ${eps}`);
  }
});

const byScheme = (rows) => Object.fromEntries(rows.map((r) => [r.scheme, r]));

test("modulo hashing reshuffles almost everything; the others move about 1/(n+1)", () => {
  const r = byScheme(compare({ keys: makeKeys(20_000), nodes: 10 }));
  assert.ok(r.modulo.moved > 0.85, `modulo ${r.modulo.moved}`);
  for (const s of ["ring", "jump", "rendezvous"]) {
    assert.ok(Math.abs(r[s].moved - 1 / 11) < 0.03, `${s} ${r[s].moved}`);
  }
});

test("bounded loads flatten the ring's hottest node at some extra movement", () => {
  const r = byScheme(compare({ keys: makeKeys(20_000), nodes: 10, vnodes: 10, eps: 0.1 }));
  assert.ok(r.ring.peakOverMean > 1.2, `ring ${r.ring.peakOverMean}`);
  assert.ok(r.bounded.peakOverMean <= 1.1 + 1e-9, `bounded ${r.bounded.peakOverMean}`);
  assert.ok(r.bounded.moved > r.ring.moved);
});

test("only modulo and bounded loads move keys between existing nodes", () => {
  const r = byScheme(compare({ keys: makeKeys(20_000), nodes: 10, vnodes: 1 }));
  for (const s of ["ring", "jump", "rendezvous"]) assert.equal(r[s].cross, 0, s);
  assert.ok(r.modulo.cross > 0.8);
  assert.ok(r.bounded.cross > 0);
});
