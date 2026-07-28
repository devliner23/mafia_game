import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import { activeCrew, playerRank } from "../selectors";
import { rankIndex, type EvidenceTrack, type GameState, type Ledger } from "../types";

/**
 * Testimonial evidence is weighted heaviest on purpose. A cooperating witness
 * is what actually ends mob careers; a crime scene rarely does. This weighting
 * is what ties the Ledger to the crew simulation instead of leaving them as
 * two unrelated meters.
 */
export const TRACK_WEIGHT: Record<EvidenceTrack, number> = {
  physical: 1.0,
  financial: 0.8,
  testimonial: 1.4,
};

export const emptyLedger = (): Ledger => ({
  physical: 0,
  financial: 0,
  testimonial: 0,
});

export const caseWeight = (l: Ledger): number =>
  l.physical * TRACK_WEIGHT.physical +
  l.financial * TRACK_WEIGHT.financial +
  l.testimonial * TRACK_WEIGHT.testimonial;

/** Indictment gets harder to trigger as you rise — you have more insulation. */
export const indictmentThreshold = (s: GameState): number =>
  220 + rankIndex(playerRank(s)) * 60;

export const caseProgress = (s: GameState): number =>
  caseWeight(s.ledger) / indictmentThreshold(s);

export function addEvidence(
  state: GameState,
  track: EvidenceTrack,
  amount: number,
  cause: string,
): GameEvent[] {
  if (amount <= 0) return [];
  state.ledger[track] = Math.round((state.ledger[track] + amount) * 100) / 100;
  return [{ type: "evidence_added", track, amount, cause }];
}

export function reduceEvidence(
  state: GameState,
  track: EvidenceTrack,
  amount: number,
  how: string,
): GameEvent[] {
  const actual = Math.min(amount, state.ledger[track]);
  if (actual <= 0) return [];
  state.ledger[track] = Math.round((state.ledger[track] - actual) * 100) / 100;
  return [{ type: "evidence_reduced", track, amount: actual, how }];
}

/**
 * Evidence you generate passively, just by existing. Indiscreet crew talk,
 * and a hot operation makes civilians talk too. This is what stops "do nothing"
 * from being a stable strategy.
 */
export function weeklyDrift(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const active = activeCrew(state);

  let chatter = 0;
  for (const c of active) {
    if (c.discretion < 50) chatter += (50 - c.discretion) / 50;
    if (c.loyalty < 35) chatter += 0.5;
  }
  if (chatter > 0) {
    events.push(...addEvidence(state, "testimonial", round1(chatter * 0.8), "loose talk"));
  }

  // Physical evidence degrades slowly on its own. Paper and testimony do not.
  if (state.ledger.physical > 0 && rng.chance(0.5)) {
    events.push(...reduceEvidence(state, "physical", round1(state.ledger.physical * 0.03), "time"));
  }

  return events;
}

export function checkIndictment(state: GameState): GameEvent[] {
  const weight = caseWeight(state.ledger);
  if (weight < indictmentThreshold(state)) return [];
  return [{ type: "indictment_filed", weight: round1(weight) }];
}

export const COOLING = {
  cleanup: { track: "physical" as const, amount: 14, cost: 3000 },
  launder: { track: "financial" as const, amount: 16, cost: 0, cutPct: 0.18 },
  layLowAll: 0.1,
};

export function applyLayLow(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  for (const track of ["physical", "financial", "testimonial"] as const) {
    events.push(
      ...reduceEvidence(state, track, round1(state.ledger[track] * COOLING.layLowAll), "lying low"),
    );
  }
  return events;
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;

export const heatPressure = (state: GameState): number =>
  clamp(caseProgress(state), 0, 2);