/**
 * Mulberry32 — a small, fast, well-distributed seeded PRNG.
 *
 * Used wherever a procedural value has to be stable across re-renders. Anything
 * generated with bare `Math.random()` inside a memo or during render is a latent
 * bug: React may discard and recompute a memo at any time, and a StrictMode
 * double-invoke will produce two different results. A seeded generator makes
 * the output a pure function of the seed instead.
 *
 * Not cryptographic and not statistically perfect — it is a visual-effects
 * distribution, not a security primitive.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
