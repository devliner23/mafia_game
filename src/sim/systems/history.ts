import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import { memberById, playerFamily } from "../selectors";
import type { Crew, Family, GameState } from "../types";
import {
  eraById,
  eventsInWeek,
  houseById,
  houseNameAt,
  lawAt,
  pressureAt,
  weekToDate,
  type Era,
  type HistoricalEvent,
  type YM,
} from "../history";
import { setRelation } from "./relations";
import { round1 } from "./ledger";

/**
 * HISTORY AS A SYSTEM.
 *
 * This runs once per week, before anything else in the weekly fold, and it is
 * the only place the corpus touches live state. Two design commitments:
 *
 *   It fires on the real week. The calendar is derived from the era's start
 *   date and the week counter, both of which are already deterministic, so a
 *   replayed command list reproduces the same history at the same points with
 *   no extra state to save.
 *
 *   It does not touch the player. Bosses die, houses turn on each other, the
 *   law changes underneath everyone — but nothing here reaches into your crew,
 *   your money or your case. History is the weather. What you did in it is
 *   still yours, and a run that ended badly should never be explainable as
 *   "the script killed me".
 *
 * The one exception is heat, which is a property of the city and therefore
 * genuinely is done to you: after Apalachin, everybody's week is worse.
 */
export function historyWeek(state: GameState, rng: Rng): GameEvent[] {
  const era = eraById(state.eraId);
  if (!era) return [];

  const events: GameEvent[] = [];

  for (const ev of eventsInWeek(era, state.week)) {
    events.push({
      type: "history_happened",
      week: state.week,
      headline: ev.headline,
      detail: ev.detail,
      contested: ev.certainty === "contested",
    });
    events.push(...applyEffects(state, ev, rng));
  }

  events.push(...renameHouses(state, era));
  return events;
}

/**
 * A house takes its new boss's name, on the date it actually did. Nothing in
 * the game logic depends on the string — but a feed that still says "Mangano"
 * in 1953 is the exact failure this whole system exists to prevent.
 */
function renameHouses(state: GameState, era: Era): GameEvent[] {
  const d = weekToDate(era.start, state.week);
  const at: YM = [d.getUTCFullYear(), d.getUTCMonth() + 1];
  const events: GameEvent[] = [];

  for (const fam of state.families) {
    const house = houseById(fam.houseId);
    if (!house) continue;
    const should = houseNameAt(house, at);
    if (should === fam.name) continue;
    const was = fam.name;
    fam.name = should;
    events.push({ type: "house_renamed", familyId: fam.id, from: was, to: should });
  }

  return events;
}

function applyEffects(state: GameState, ev: HistoricalEvent, rng: Rng): GameEvent[] {
  const fx = ev.effects;
  if (!fx) return [];
  const events: GameEvent[] = [];

  if (typeof fx.heat === "number") {
    for (const fam of state.families) {
      fam.heat = clamp(round1(fam.heat + fx.heat), 0, 100);
    }
  }

  if (fx.relation) {
    const { a, b, to } = fx.relation;
    if (state.families.some((f) => f.id === a) && state.families.some((f) => f.id === b)) {
      setRelation(state, a, b, to);
      events.push({ type: "relation_shifted", familyId: a, withFamilyId: b, value: to, reason: "history" });
    }
  }

  if (fx.killBossOf) {
    events.push(...removeBoss(state, fx.killBossOf, ev));
  }

  if (fx.splitHouse) {
    events.push(...splitHouse(state, fx.splitHouse, rng));
  }

  return events;
}

/**
 * The documented death, arrest or departure of a boss.
 *
 * The successor is *not* read out of the corpus. The record says who actually
 * took the chair; this world has a player in it who may be standing next to it,
 * so the seat is refilled by the same succession rules that govern every other
 * vacancy. History decides that the chair empties. The simulation decides who
 * sits down.
 */
function removeBoss(state: GameState, houseId: string, ev: HistoricalEvent): GameEvent[] {
  const fam = state.families.find((f) => f.id === houseId);
  if (!fam) return [];
  const boss = memberById(state, fam.bossId);
  if (!boss || boss.status !== "active") return [];

  // If the player has climbed into that chair, history does not get to have him.
  // The date passes; the man it was about is already gone from the story.
  if (boss.isPlayer) {
    return [{ type: "history_missed", week: state.week, headline: ev.headline }];
  }

  boss.status = ev.headline.match(/arrest|convict|tax|warrant/i) ? "arrested" : "dead";
  fam.heat = clamp(round1(fam.heat + 8), 0, 100);
  fam.reputation = clamp(fam.reputation - 4, 0, 100);

  const out: GameEvent[] = [
    { type: "seat_emptied", familyId: fam.id, crewId: boss.id, seat: "boss", reason: "history" },
  ];

  // Everyone who was tied to him takes it personally, whichever house they're in.
  for (const m of fam.members) {
    if (m.status !== "active" || m.id === boss.id) continue;
    const tie = m.bonds.find((b) => b.otherId === boss.id);
    if (!tie || tie.strength <= 0) continue;
    m.loyalty = clamp(round1(m.loyalty - tie.strength / 20), 0, 100);
  }

  return out;
}

/**
 * A house turns on itself. Not a war between families — a line drawn through
 * one, with every man in it forced to be seen standing on a side.
 */
function splitHouse(state: GameState, houseId: string, rng: Rng): GameEvent[] {
  const fam = state.families.find((f) => f.id === houseId);
  if (!fam) return [];

  const capos = fam.members.filter((m) => m.rank === "capo" && m.status === "active");
  if (capos.length < 2) return [];
  const rebel = rng.pick(capos);

  fam.splitFactionId = rebel.id;
  fam.heat = clamp(round1(fam.heat + 10), 0, 100);

  for (const m of fam.members) {
    if (m.status !== "active" || m.isPlayer) continue;
    const withRebel = m.factionId === rebel.id;
    m.loyalty = clamp(round1(m.loyalty + (withRebel ? -18 : -6)), 0, 100);
    m.grudges += withRebel ? 1 : 0;
  }

  return [{ type: "house_split", familyId: fam.id, factionId: rebel.id }];
}

/* ------------------------------------------------------------------ the knobs */

/**
 * What the rest of the engine should be reading instead of its own constants.
 * Call it once per step and pass it down; it is pure and cheap.
 */
export function currentPressure(state: GameState) {
  const era = eraById(state.eraId)!;
  return pressureAt(era, state.week, state.playerHeritage);
}

export function currentLaw(state: GameState) {
  return lawAt(eraById(state.eraId)!, state.week);
}

/** True if the ladder can reach `soldier` at all right now. */
export const booksOpen = (state: GameState): boolean => currentLaw(state).booksOpen;

export const houseOf = (state: GameState, id: string): Family | undefined =>
  state.families.find((f) => f.id === id);

export const isHistorical = (c: Crew): boolean => c.historical === true;

export { playerFamily };