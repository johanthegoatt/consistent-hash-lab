# consistent-hash-lab

With `hash(key) % n`, growing a cache cluster from 10 to 11 nodes gives about 90% of keys a new owner, and each of those is a cold miss. Consistent hashing moves only the 1/(n+1) share the new node should take. This repo implements four consistent schemes with no dependencies and compares them with modulo hashing on one seeded key set.

Live: https://consistent-hash-lab.johanthegoat.xyz

## Results

20,000 keys on 10 nodes, then 11. Ring and bounded loads use 100 vnodes per node, bounded loads uses epsilon = 0.25. Averaged over seeds 1 to 5 (`node --test` checks the shape of these):

| Scheme | Busiest node vs fair share | CV of load | Keys moved on join | Moved between old nodes |
| --- | ---: | ---: | ---: | ---: |
| `hash % n` | 1.03x | 1.9% | 90.8% | 81.8% |
| Vnode ring | 1.29x | 15.1% | 9.6% | 0 |
| Jump hash | 1.04x | 2.2% | 9.2% | 0 |
| Rendezvous | 1.04x | 2.1% | 8.9% | 0 |
| Bounded loads | 1.24x | 14.1% | 10.0% | 0.4% |

The ideal share moved is 1/11 = 9.1%. Jump hash and rendezvous spread keys as evenly as modulo does while moving only what they must. The ring needs many vnodes to get close; with one point per node the busiest node holds about 3x its share. Bounded loads caps the ring's hottest node at the cost of a small cascade of moves between existing nodes.

## How each one works

- **Vnode ring** (`createRing`): each node hashes `node#0..node#v-1` onto a 32-bit circle and a key goes to the first point clockwise, found by binary search. From Karger et al., *Consistent Hashing and Random Trees*, STOC 1997.
- **Jump hash** (`jumpHash`): a 64-bit LCG seeded by the key jumps through bucket numbers in O(log n) time and no memory. From Lamping and Veach, *A Fast, Minimal Memory, Consistent Hash Algorithm*, 2014. Buckets are numbered, so only the last one can leave.
- **Rendezvous** (`rendezvous`): every node scores the key and the highest score wins, O(n) per lookup, any node can leave. From Thaler and Ravishankar, *Using Name-Based Mappings to Increase Hit Rates*, IEEE/ACM ToN 1998. Weights use the logarithmic score `-w / ln(u)`, so node i receives `w_i / sum(w)` of keys; a test checks a 1:2:1 split.
- **Bounded loads** (`assignBounded`): the ring plus a cap of `ceil((1 + eps) * m / n)` keys per node; a key whose node is full walks clockwise to the next node with room. From Mirrokni, Thorup and Zadimoghaddam, *Consistent Hashing with Bounded Loads*, SODA 2018. A test checks the cap holds for eps 0.05, 0.25 and 1.

All schemes hash with MurmurHash3 x86_32, checked against the reference vectors. The tests assert the defining property directly: when a node joins, every key that moves goes to that node.

## Use

```js
import { createRing } from "./src/ring.js";
import { jumpHash } from "./src/jump.js";
import { rendezvous } from "./src/rendezvous.js";

const ring = createRing({ vnodes: 100 });
["cache-a", "cache-b", "cache-c"].forEach((n) => ring.add(n));
ring.lookup("user:42");

jumpHash("user:42", 3);                 // 0, 1 or 2
rendezvous("user:42", ["a", "b", "c"], { weights: { a: 1, b: 2, c: 1 } });
```

## Layout

```
src/hash.js        MurmurHash3 x86_32, 64-bit key for jump hash
src/ring.js        vnode ring
src/jump.js        jump consistent hash
src/rendezvous.js  weighted highest-random-weight hashing
src/bounded.js     bounded-load placement on the ring
src/sim.js         places a key set under each scheme and measures spread and movement
index.html         the lab page; open it through any static server
test/              node --test
```

```
npm test
```

## License

MIT
