// Skyline Courier — a small seeded random source (mulberry32) so a mission
// always builds the same valley, river and peaks from its seed. The screenshots
// and the autopilot both lean on this: the same seed, the same world.
export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    /** A float in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    /** One of the given values, picked at random. */
    pick(values) {
      return values[Math.floor(this.next() * values.length)];
    },
    /** True with probability `p` (0..1): a coin toss with loaded odds. */
    bool(p = 0.5) {
      return this.next() < p;
    },
    /** A random sign, +1 or -1. */
    sign() {
      return this.next() < 0.5 ? -1 : 1;
    },
    /** A shuffled copy of the given array (Fisher-Yates). */
    shuffle(values) {
      const copy = [...values];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
