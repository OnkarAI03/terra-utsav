/**
 * Small deterministic PRNG. The browser and the server must generate the exact same level from
 * the same seed, so the game never uses Math.random() for anything that affects scoring.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function between(rnd: () => number, min: number, max: number): number {
  return min + (max - min) * rnd();
}

/** Uniform integer in [0, n). */
export function pick(rnd: () => number, n: number): number {
  return Math.min(n - 1, Math.floor(rnd() * n));
}

/** A fresh 31-bit seed from the platform's cryptographic RNG (browser or Node). */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] & 0x7fffffff;
}
