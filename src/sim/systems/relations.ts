import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import { chainOfCommand, isActive, memberById, playerFamily } from "../selectors";
import { round1 } from "./ledger";
import type { Bond, Crew, Family, GameState } from "../types";

/**
 * Politics.
 *
 * Three ideas, and everything in the game is built out of them:
 *
 *   1. REGARD — what each man thinks of you personally, as distinct from
 *      loyalty, which is only ever about the man he reports to. Regard is what
 *      gets you sponsored, backed, warned, and spared.
 *   2. BONDS — sparse ties between specific men. You cannot touch one person.
 *      Anything you do to him lands, at reduced strength, on everyone tied to
 *      him. This is what makes a single decision expensive.
 *   3. FACTIONS — every made man came up under somebody. Camps back their own
 *      in a succession, and a man promoted over another camp's candidate has
 *      made an enemy of the whole camp, not one man.
 */

/** Regard below this and he is actively working against you. */
export const HOSTILE = -25;
/** Regard above this and he will take a risk for you. */
export const FRIENDLY = 35;

const chainIds = (state: GameState): string[] => chainOfCommand(state).map((c) => c.id);

export const bondTo = (c: Crew, otherId: string): Bond | undefined =>
  c.bonds.find((b) => b.otherId === otherId);

export const tiedTo = (fam: Family, id: string): Crew[] =>
  fam.members.filter((m) => m.status === "active" && m.bonds.some((b) => b.otherId === id));

/**
 * The core primitive. Move one man's opinion of you, then let it travel down
 * every tie he has. A friend of the man you crossed takes it personally; a
 * rival of the man you crossed is quietly pleased.
 */
export function shiftRegard(
  state: GameState,
  targetId: string,
  delta: number,
  reason: string,
  depth = 0,
): GameEvent[] {
  const fam = playerFamily(state);
  const target = fam.members.find((m) => m.id === targetId);
  if (!target || target.status !== "active" || target.isPlayer) return [];

  const before = target.regard;
  target.regard = clamp(round1(target.regard + delta), -100, 100);
  const events: GameEvent[] = [];
  const actual = round1(target.regard - before);
  if (actual !== 0) {
    events.push({ type: "regard_shifted", crewId: targetId, delta: actual, reason });
  }

  // The ripple. One hop only — the city is not a nervous system.
  if (depth > 0) return events;
  for (const other of tiedTo(fam, targetId)) {
    if (other.isPlayer) continue;
    const bond = bondTo(other, targetId);
    if (!bond) continue;
    // A rival's misfortune reads as your favour, and the reverse.
    const carried = round1(delta * (bond.strength / 100) * 0.55);
    if (Math.abs(carried) < 1) continue;
    events.push(...shiftRegard(state, other.id, carried, `on account of ${target.name}`, 1));
  }

  return events;
}

/** Everyone who would stand behind a given man if it came to it, as a number. */
export function backingFor(state: GameState, id: string): number {
  const fam = playerFamily(state);
  const subject = memberById(state, id);
  if (!subject) return 0;

  let total = 0;
  for (const m of fam.members) {
    if (m.status !== "active" || m.id === id) continue;
    const weight = m.competence / 100;

    if (m.superiorId === id) total += weight * (m.loyalty >= 55 ? 1 : 0.2);
    if (m.factionId === subject.factionId) total += weight * 0.5;

    const bond = bondTo(m, id);
    if (bond) total += weight * (bond.strength / 100);

    if (subject.isPlayer) total += weight * (m.regard / 100);
  }
  return round1(total);
}

/** Support you personally command, which is not the same as men you command. */
export const playerBacking = (state: GameState): number => backingFor(state, "player");

/**
 * Who in the house is worth cultivating and who is already gone. Used by the
 * situation generator to pick people the choice will actually hurt.
 */
export const hostiles = (state: GameState): Crew[] =>
  playerFamily(state).members.filter(
    (m) => m.status === "active" && !m.isPlayer && m.regard <= HOSTILE,
  );

export const friends = (state: GameState): Crew[] =>
  playerFamily(state).members.filter(
    (m) => m.status === "active" && !m.isPlayer && m.regard >= FRIENDLY,
  );

/** Weekly opinion drift. Attention is a resource and neglect is a decision. */
export function regardDrift(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const fam = playerFamily(state);

  // Neglect is only a thing between people who have a relationship. Sixty men
  // across town do not think less of you every week for not visiting them —
  // they simply forget you, which is what the decay term is for.
  const close = new Set<string>([
    ...fam.members.filter((m) => m.superiorId === "player").map((m) => m.id),
    ...chainIds(state),
  ]);

  for (const m of fam.members) {
    if (m.status !== "active" || m.isPlayer) continue;

    let delta = 0;
    // Men you actually deal with forget you if you don't come around.
    if (close.has(m.id) && m.weeksSinceReassured > 8) delta -= 1.2;
    // Ambitious men in your own camp resent your ceiling on them.
    if (m.factionId === "player" && m.ambition > 65 && m.grudges > 0) delta -= 1.5;
    // Men you have carried stay carried, slowly.
    if (m.earnings > 20000 && rng.chance(0.3)) delta += 0.8;
    // Opinions decay toward indifference, so nothing is permanent but grudges.
    delta += m.regard > 0 ? -0.35 : 0.55;

    if (Math.abs(delta) < 0.1) continue;
    const before = m.regard;
    m.regard = clamp(round1(m.regard + delta), -100, 100);
    const actual = round1(m.regard - before);
    if (actual <= -2) {
      events.push({ type: "regard_shifted", crewId: m.id, delta: actual, reason: "distance" });
    }
  }

  return events;
}

/* ---------------------------------------------------------------- families */

export const relationBetween = (a: Family, b: string): number => a.relations[b] ?? 0;

/** Relations are symmetric. Writing one side and not the other is a bug. */
export function setRelation(state: GameState, aId: string, bId: string, value: number): void {
  const v = clamp(Math.round(value), -100, 100);
  const a = state.families.find((f) => f.id === aId);
  const b = state.families.find((f) => f.id === bId);
  if (!a || !b || aId === bId) return;
  a.relations[bId] = v;
  b.relations[aId] = v;
}

export function shiftRelation(
  state: GameState,
  aId: string,
  bId: string,
  delta: number,
  reason: string,
): GameEvent[] {
  const a = state.families.find((f) => f.id === aId);
  if (!a) return [];
  const before = relationBetween(a, bId);
  setRelation(state, aId, bId, before + delta);
  const after = relationBetween(a, bId);
  if (after === before) return [];
  const events: GameEvent[] = [
    { type: "relation_shifted", familyId: aId, withFamilyId: bId, value: after, reason },
  ];
  if (before > WAR && after <= WAR) {
    events.push({ type: "war_declared", familyId: aId, withFamilyId: bId });
  }
  if (before <= WAR && after > WAR) {
    events.push({ type: "peace_made", familyId: aId, withFamilyId: bId });
  }
  return events;
}

/** Below this the shooting starts. */
export const WAR = -50;

export const atWarWith = (state: GameState, fam: Family): Family[] =>
  state.families.filter((f) => f.id !== fam.id && relationBetween(fam, f.id) <= WAR);

/**
 * A week of open war. Men die on both sides, earners stay home, and every body
 * is physical evidence somebody has to explain.
 */
export function warWeek(state: GameState, fam: Family, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];

  for (const enemy of atWarWith(state, fam)) {
    // Only resolve each pairing once, from the lower id.
    if (fam.id > enemy.id) continue;

    for (const [side, other] of [
      [fam, enemy],
      [enemy, fam],
    ] as const) {
      const strength = side.members.filter((m) => m.status === "active").length;
      const odds = clamp(0.1 + strength / 400, 0.05, 0.4);
      if (!rng.chance(odds)) continue;

      const targets = other.members.filter(
        (m) => m.status === "active" && !m.isPlayer && m.rank !== "boss",
      );
      if (targets.length === 0) continue;
      const hit = rng.pick(targets);
      hit.status = "dead";
      events.push({ type: "war_casualty", familyId: other.id, crewId: hit.id, byFamilyId: side.id });

      // Everyone tied to a dead man takes it personally.
      if (other.id === state.playerFamilyId) {
        events.push(...shiftRegard(state, hit.id, 0, "killed"));
        for (const m of tiedTo(other, hit.id)) {
          m.loyalty = clamp(round1(m.loyalty - 4), 0, 100);
        }
      }
      other.heat = clamp(other.heat + 6, 0, 100);
      other.reputation = clamp(other.reputation - 2, 0, 100);
    }
  }

  return events;
}

/** Relations creep back toward ordinary business if nobody keeps them hot. */
export function relationDrift(state: GameState): void {
  for (const a of state.families) {
    for (const b of state.families) {
      if (a.id >= b.id) continue;
      const v = relationBetween(a, b.id);
      if (v === 0) continue;
      // War does not cool on its own. Somebody has to sit down.
      const step = v <= WAR ? 0.15 : v < 0 ? 0.6 : -0.4;
      setRelation(state, a.id, b.id, v + step);
    }
  }
}

export const isActiveMember = (c: Crew | undefined): c is Crew => isActive(c);