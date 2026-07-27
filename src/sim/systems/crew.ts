import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import { heatPressure, round1 } from "./ledger";
import { RANKS, rankIndex, type Crew, type GameState, type Secret } from "../types";

const SECRETS: readonly Secret[] = [
  "none",
  "none",
  "gambling_debts",
  "skimming",
  "a_body_of_their_own",
  "talking_to_feds",
];

export function makeCrew(rng: Rng, id: string, name: string): Crew {
  return {
    id,
    name,
    rank: "associate",
    competence: rng.stat(52, 26),
    loyalty: rng.stat(66, 20),
    ambition: rng.stat(48, 30),
    discretion: rng.stat(55, 25),
    grudges: 0,
    knowledge: rng.stat(10, 6),
    earnings: 0,
    status: "active",
    secret: rng.pick(SECRETS),
    weeksSinceReassured: 0,
    superiorId: '1',     
    familyId: "1",
  };
}

export const activeCrew = (s: GameState): Crew[] =>
  s.crew.filter((c) => c.status === "active");

/**
 * The number that decides whether someone moves on you.
 *
 * Ambition is the engine, low loyalty is the permission, competence is the
 * means, and grudges are the memory. A capable, ambitious man you passed over
 * twice is the single most dangerous object in the game — which is exactly the
 * fiction this is meant to reproduce.
 */
export function coupThreat(c: Crew): number {
  if (c.status !== "active") return 0;
  const ambition = c.ambition / 100;
  const disloyalty = 1 - c.loyalty / 100;
  const means = 0.5 + c.competence / 200;
  const memory = 1 + c.grudges * 0.35;
  return ambition * disloyalty * means * memory;
}

export function weeklyLoyaltyDrift(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const pressure = heatPressure(state);

  for (const c of activeCrew(state)) {
    c.weeksSinceReassured += 1;

    let delta = -0.6;
    let cause = "drift";

    if (c.weeksSinceReassured > 6) {
      delta -= 0.8;
      cause = "neglect";
    }
    if (c.grudges > 0) {
      delta -= 0.5 * c.grudges;
      cause = "resentment";
    }
    // Heat frightens people. Frightened men are the ones who talk.
    if (pressure > 0.5) {
      delta -= pressure * 1.6;
      cause = "pressure";
    }
    // Capable and ambitious but going nowhere.
    if (c.competence > 60 && c.ambition > 60 && rankIndex(c.rank) < rankIndex(state.rank) - 1) {
      delta -= 0.7;
      cause = "stalled";
    }
    if (c.secret === "gambling_debts" && rng.chance(0.08)) {
      delta -= 3;
      cause = "money trouble";
    }

    const before = c.loyalty;
    c.loyalty = clamp(round1(c.loyalty + delta), 0, 100);
    const actual = round1(c.loyalty - before);
    if (actual !== 0) {
      events.push({ type: "loyalty_shifted", crewId: c.id, delta: actual, cause });
    }

    // Visible warning signs. The player is meant to be able to see it coming.
    const threat = coupThreat(c);
    if (threat > 0.34 && rng.chance(0.12)) {
      events.push({
        type: "crew_grumbled",
        crewId: c.id,
        about: c.grudges > 0 ? "being passed over" : "his end of the take",
      });
    }
    if (c.secret === "talking_to_feds" && rng.chance(0.05)) {
      events.push({ type: "secret_surfaced", crewId: c.id, secret: c.secret });
    }
  }

  return events;
}

export function checkCoup(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const crew = activeCrew(state);

  for (const c of crew) {
    const threat = coupThreat(c);
    if (threat < 0.44) continue;
    if (!rng.chance((threat - 0.42) * 0.16)) continue;

    // Backing comes from everyone else who is also unhappy.
    const backing = crew
      .filter((o) => o.id !== c.id)
      .reduce((sum, o) => sum + (o.loyalty < 45 ? o.competence / 100 : 0), 0);
    const defence = crew
      .filter((o) => o.id !== c.id)
      .reduce((sum, o) => sum + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);

    const attack = c.competence / 100 + backing;
    const succeeded = attack > defence + 0.6 || rng.chance(0.2);

    events.push({ type: "coup_attempted", crewId: c.id, succeeded });
    return events; // one move at a time
  }

  return events;
}

/** On indictment, the men decide whether you are worth going to prison for. */
export function resolveIndictment(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];

  for (const c of activeCrew(state)) {
    const exposure = 0.35 + (c.knowledge / 100) * 0.4;
    if (!rng.chance(exposure)) continue;

    const flipChance = clamp(
      (1 - c.loyalty / 100) * 0.85 + (c.secret === "talking_to_feds" ? 0.4 : 0),
      0,
      0.95,
    );

    if (rng.chance(flipChance)) {
      c.status = "flipped";
      const dump = round1(c.knowledge * 1.5);
      state.ledger.testimonial = round1(state.ledger.testimonial + dump);
      events.push({ type: "crew_flipped", crewId: c.id, testimonialDump: dump });
    } else {
      c.status = "arrested";
      events.push({ type: "crew_arrested", crewId: c.id });
    }
  }

  return events;
}

export function promote(state: GameState, crewId: string): GameEvent[] {
  const target = state.crew.find((c) => c.id === crewId);
  if (!target || target.status !== "active") return [];

  const next = RANKS[Math.min(rankIndex(target.rank) + 1, rankIndex(state.rank) - 1)];
  if (!next || rankIndex(next) <= rankIndex(target.rank)) return [];

  const events: GameEvent[] = [];
  target.rank = next;
  target.loyalty = clamp(target.loyalty + 14, 0, 100);
  // The permanent cost: you just taught him he can move up.
  target.ambition = clamp(target.ambition + 9, 0, 100);
  target.knowledge = clamp(target.knowledge + 12, 0, 100);
  target.weeksSinceReassured = 0;
  events.push({ type: "crew_promoted", crewId: target.id, to: next });

  // Everyone equally qualified who did not get it remembers.
  for (const other of activeCrew(state)) {
    if (other.id === target.id) continue;
    if (other.competence >= target.competence - 8 && other.ambition > 45) {
      other.grudges += 1;
      other.loyalty = clamp(other.loyalty - 6, 0, 100);
      events.push({ type: "crew_passed_over", crewId: other.id, inFavourOf: target.id });
    }
  }

  return events;
}

/**
 * Runs the AI simulation on the ENTIRE player's family.
 * This makes the world feel alive, as capos and the underboss scheme against the boss.
 */
export function simulateFamilyPolitics(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const family = state.families.find(f => f.id === state.playerFamilyId);
  if (!family) return events;

  // Exclude the player from AI drift/coups, the player controls themselves
  const aiMembers = family.members.filter(m => m.id !== "player" && m.status === "active");

  // 1. Loyalty Drift
  events.push(...weeklyLoyaltyDrift({ ...state, crew: aiMembers }, rng));

  // 2. Coup Checks (Capos vs Underboss, Underboss vs Boss, etc.)
  events.push(...checkCoup({ ...state, crew: aiMembers }, rng));

  // Resolve successful coups
  for (const ev of events) {
    if (ev.type === "coup_attempted" && ev.succeeded) {
      const usurper = family.members.find(m => m.id === ev.crewId);
      const currentBoss = family.members.find(m => m.id === family.bossId);
      
      if (usurper && currentBoss) {
        currentBoss.status = "dead";
        usurper.rank = "boss";
        family.bossId = usurper.id;
        // Usurper's direct superior spot is now open, etc.
        events.push({ type: 'boss_killed', succeeded: ev.succeeded, by: usurper.id });
      }
    }
  }

  return events;
}

/**
 * Player interacts with a family member they don't directly control.
 * E.g., taking them out for drinks to reduce their grudges/heat.
 */
export function interactWithSuperior(state: GameState, targetId: string, action: "drink" | "gift" | "reassure"): GameEvent[] {
  const family = state.families.find(f => f.id === state.playerFamilyId);
  const target = family?.members.find(m => m.id === targetId);
  if (!target) return [];

  const events: GameEvent[] = [];

  if (action === "reassure") {
    target.weeksSinceReassured = 0;
    target.loyalty = clamp(target.loyalty + 3, 0, 100);
    target.grudges = Math.max(0, target.grudges - 1);
    events.push({ type: "interacted", crewId: target.id, action });
  }

  if (action === "gift") {
    // Maybe costs ledger cash
    target.loyalty = clamp(target.loyalty + 8, 0, 100);
    state.player.loyalty = clamp(state.player.loyalty + 2, 0, 100); // Player looks good
    events.push({ type: "interacted", crewId: target.id, action });
  }

  return events;
}

/**
 * The player can only recruit their own crew once they reach 'capo' rank.
 */
export function canRecruitCrew(state: GameState): boolean {
  return rankIndex(state.rank) >= rankIndex("capo");
}