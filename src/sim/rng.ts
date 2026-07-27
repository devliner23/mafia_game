/**
 * Deterministic seeded PRNG (mulberry32).
 *
 * The sim must never call Math.random(). Every stochastic decision goes
 * through here so that a seed plus a command list reproduces a run exactly.
 * The state is a plain number, so it serialises into the save file for free.
 */
export class Rng {
  constructor(public state: number) {}

  static fromSeed(seed: string | number): Rng {
    if (typeof seed === "number") return new Rng(seed >>> 0);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return new Rng(h >>> 0);
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick: empty array");
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Roughly normal, clamped. Used for rolling crew stats. */
  stat(mean: number, spread: number): number {
    const n = (this.next() + this.next() + this.next()) / 3;
    return clamp(Math.round(mean + (n - 0.5) * 2 * spread), 0, 100);
  }

  clone(): Rng {
    return new Rng(this.state);
  }
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
