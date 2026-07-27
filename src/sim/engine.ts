import type { Command, GameEvent, Step } from "./events";
import { clamp, Rng } from "./rng";
import {
  activeCrew,
  checkCoup,
  makeCrew,
  promote,
  resolveIndictment,
  weeklyLoyaltyDrift,
  simulateFamilyPolitics, // Ensure you export this from systems/crew.ts
} from "./systems/crew";
import {
  addEvidence,
  applyLayLow,
  caseProgress,
  checkIndictment,
  COOLING,
  reduceEvidence,
  round1,
  weeklyDrift,
} from "./systems/ledger";
import {
  RANKS,
  rankIndex,
  type Background,
  type Crew,
  type Family,
  type GameState,
  type Job,
  type NewGameOptions,
  type Rank,
} from "./types";

export interface SimConfig {
  jobs: Job[];
  names: readonly string[];
  backgrounds: Background[];
}

export const RECRUIT_COST = 2000;
export const REASSURE_COST = 1500;

/** Standing needed to reach each rank. */
export const RANK_STANDING: Record<Rank, number> = {
  associate: 0,
  soldier: 40,
  capo: 120,
  underboss: 260,
  boss: 460,
};

// --- WORLD GENERATION DATA ---
const FIRST_NAMES = ["Vincent", "Salvatore", "Anthony", "Giovanni", "Carmine", "Frank", "Dominic", "Vito", "Paulie", "Luca", "Rocco", "Eddie"];
const FAMILY_NAMES = ["Gambino", "Genovese", "Lucchese", "Bonanno", "Profaci"];

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[rng.int(0, arr.length - 1)]!;
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMember(
  rng: Rng,
  familyId: string,
  rank: Rank,
  superiorId: string | null,
  namePool: readonly string[],
  isPlayer = false,
  playerName?: string
): Crew {
  const id = isPlayer ? "player" : `m_${rng.int(1000, 9999)}${rng.int(1000, 9999)}`;
  const name = isPlayer ? (playerName ?? "You") : pick(rng, namePool);
  
  const c = makeCrew(rng, id, name);
  return {
    ...c,
    familyId,
    superiorId,
    rank,
    // Scale stats for higher ranks so Bosses are actually dangerous
    competence: isPlayer ? c.competence : clamp(c.competence + (rank === "boss" ? 30 : rank === "underboss" ? 20 : rank === "capo" ? 10 : 0), 0, 100),
    knowledge: isPlayer ? c.knowledge : rank === "boss" ? 100 : clamp(c.knowledge + (rank === "underboss" ? 30 : rank === "capo" ? 15 : 0), 0, 100),
  };
}

export function createGame(
  seed: string,
  config: SimConfig,
  options: NewGameOptions,
): GameState {
  const rng = Rng.fromSeed(seed);
  const bg =
    config.backgrounds.find((b) => b.id === options.background) ?? config.backgrounds[0]!;

  // --- CITY & FAMILY GENERATION ---
  const families: Family[] = [];
  let player: Crew | undefined;
  let playerFamilyId: string = "";

  const numFamilies = rng.int(3, 5);
  const chosenNames = shuffle(rng, [...FAMILY_NAMES]).slice(0, numFamilies);

  for (let i = 0; i < numFamilies; i++) {
    const familyId = `fam_${i}`;
    const members: Crew[] = [];

    const boss = makeMember(rng, familyId, "boss", null, config.names);
    members.push(boss);
    const underboss = makeMember(rng, familyId, "underboss", boss.id, config.names);
    members.push(underboss);
    
    const numCapos = rng.int(2, 4);
    for (let c = 0; c < numCapos; c++) {
      const capo = makeMember(rng, familyId, "capo", underboss.id, config.names);
      members.push(capo);
      
      const numSoldiers = rng.int(3, 6);
      for (let s = 0; s < numSoldiers; s++) {
        const soldier = makeMember(rng, familyId, "soldier", capo.id, config.names);
        members.push(soldier);
        
        const numAssociates = rng.int(1, 4);
        for (let a = 0; a < numAssociates; a++) {
          const assoc = makeMember(rng, familyId, "associate", soldier.id, config.names);
          members.push(assoc);
        }
      }
    }

    // Player starts in Family 0
    if (i === 0) {
      const soldiers = members.filter(m => m.rank === "soldier");
      const mentor = pick(rng, soldiers);
      player = makeMember(rng, familyId, "associate", mentor.id, config.names, true, options.name);
      playerFamilyId = familyId;
      members.push(player);
    }

    families.push({
      id: familyId,
      name: chosenNames[i]!,
      bossId: boss.id,
      members,
      reputation: 50,
      heat: 0,
    });
  }

  const state: GameState = {
    // Player is now a proper Crew member object
    player: { ...player!, background: bg.id }, 
    families,
    playerFamilyId,
    seed,
    week: 1,
    rank: "associate",
    money: bg.money,
    ledger: { ...bg.ledger },
    crew: [], // Player starts with NO direct crew
    standing: bg.standing,
    heatMemory: 0,
    over: null,
    rngState: 0,
    nextCrewId: 1,
  };
  state.rngState = rng.state;
  return state;
}

const rngOf = (s: GameState): Rng => new Rng(s.rngState);
const saveRng = (s: GameState, rng: Rng): void => {
  s.rngState = rng.state;
};

/** Mutating step. Used by the soak runner where allocation cost matters. */
export function stepMutable(state: GameState, cmd: Command, config: SimConfig): Step {
  if (state.over) return { events: [], rejected: "run is over" };
  const rng = rngOf(state);
  const events: GameEvent[] = [];
  let rejected: string | undefined;

  switch (cmd.type) {
    case "run_job": {
      const job = config.jobs.find((j) => j.id === cmd.jobId);
      if (!job) {
        rejected = "no such job";
        break;
      }
      if (rankIndex(state.rank) < rankIndex(job.minRank)) {
        rejected = "rank too low";
        break;
      }
      const team = state.crew.filter(
        (c) => cmd.crewIds.includes(c.id) && c.status === "active",
      );
      const needed = state.rank === "associate" ? 0 : job.crewNeeded;
      if (team.length < needed) {
        rejected = "not enough crew";
        break;
      }

      const skill =
        team.length > 0
          ? team.reduce((s, c) => s + c.competence, 0) / team.length
          : 45 + rankIndex(state.rank) * 5;
      const success = rng.chance(clamp(0.35 + (skill - job.difficulty) / 120, 0.08, 0.95));

      if (success) {
        const payout = Math.round(job.payout * (0.85 + rng.next() * 0.3));
        state.money += payout;
        state.standing += Math.max(1, Math.round(job.payout / 2500));
        for (const c of team) {
          c.earnings += Math.round(payout / Math.max(team.length, 1) / 4);
          c.knowledge = clamp(c.knowledge + 1.5, 0, 100);
        }
        events.push({ type: "job_succeeded", jobId: job.id, crewIds: team.map((c) => c.id), payout });
        events.push({ type: "money_changed", delta: payout, reason: job.name });
      } else {
        events.push({ type: "job_failed", jobId: job.id, crewIds: team.map((c) => c.id) });
      }

      const mult = success ? 1 : 1.4;
      for (const track of ["physical", "financial", "testimonial"] as const) {
        events.push(
          ...addEvidence(state, track, round1(job.evidence[track] * mult), job.name),
        );
      }
      break;
    }

    case "recruit": {
      // Associates and Soldiers cannot recruit
      if (rankIndex(state.rank) < rankIndex("soldier")) {
        rejected = "you must be a soldier to command associates";
        break;
      }
      if (state.money < RECRUIT_COST) {
        rejected = "cannot afford";
        break;
      }
      if (activeCrew(state).length >= crewCap(state.rank)) {
        rejected = "crew is full";
        break;
      }
      state.money -= RECRUIT_COST;
      const id = `c${state.nextCrewId++}`;
      const name = config.names[rng.int(0, config.names.length - 1)] ?? `Associate ${id}`;
      const c = makeCrew(rng, id, name);
      // Assign them to the player's family and make the player their superior
      c.familyId = state.playerFamilyId;
      c.superiorId = "player";
      state.crew.push(c);
      events.push({ type: "money_changed", delta: -RECRUIT_COST, reason: "recruiting" });
      events.push({ type: "crew_recruited", crewId: id, name });
      break;
    }

    case "promote":
      events.push(...promote(state, cmd.crewId));
      if (events.length === 0) rejected = "cannot promote";
      break;

    case "reassure": {
      // Look in player's crew first, then in the player's family for superiors
      const family = state.families.find(f => f.id === state.playerFamilyId);
      const c = state.crew.find((x) => x.id === cmd.crewId && x.status === "active") 
             ?? family?.members.find((x) => x.id === cmd.crewId && x.status === "active");
            
      if (!c) {
        rejected = "no such target";
        break;
      }
      if (c.id === "player") {
        rejected = "cannot reassure yourself";
        break;
      }
      if (state.money < REASSURE_COST) {
        rejected = "cannot afford";
        break;
      }
      state.money -= REASSURE_COST;
      c.loyalty = clamp(c.loyalty + 9, 0, 100);
      c.weeksSinceReassured = 0;
      events.push({ type: "money_changed", delta: -REASSURE_COST, reason: "an envelope" });
      events.push({ type: "crew_reassured", crewId: c.id });
      break;
    }

    case "launder": {
      const cut = Math.round(state.money * COOLING.launder.cutPct);
      state.money -= cut;
      events.push({ type: "money_changed", delta: -cut, reason: "laundering" });
      events.push(
        ...reduceEvidence(state, "financial", COOLING.launder.amount, "washed through a front"),
      );
      break;
    }

    case "cleanup": {
      if (state.money < COOLING.cleanup.cost) {
        rejected = "cannot afford";
        break;
      }
      state.money -= COOLING.cleanup.cost;
      events.push({ type: "money_changed", delta: -COOLING.cleanup.cost, reason: "cleanup" });
      events.push(
        ...reduceEvidence(state, "physical", COOLING.cleanup.amount, "scene cleaned"),
      );
      break;
    }

    case "lay_low": {
      events.push(...applyLayLow(state));
      state.standing = Math.max(0, state.standing - 2);
      for (const c of activeCrew(state)) {
        c.loyalty = clamp(round1(c.loyalty - 1.2), 0, 100);
      }
      break;
    }

    case "retire": {
      if (state.rank !== "boss" || state.standing < RANK_STANDING.boss + 120) {
        rejected = "not yet";
        break;
      }
      state.over = { reason: "retired", week: state.week };
      events.push({ type: "run_ended", reason: "retired" });
      break;
    }

    case "end_week": {
      events.push(...weeklyDrift(state, rng));
      events.push(...weeklyLoyaltyDrift(state, rng));
      
      // Simulate the AI family politics (drift and coups among non-player family members)
      events.push(...simulateFamilyPolitics(state, rng));

      const indicted = checkIndictment(state);
      if (indicted.length > 0) {
        events.push(...indicted);
        events.push(...resolveIndictment(state, rng));
        if (activeCrew(state).length === 0 || caseProgress(state) > 1.6) {
          state.over = { reason: "indicted", week: state.week };
          events.push({ type: "run_ended", reason: "indicted" });
          break;
        }
      }

      const coup = checkCoup(state, rng);
      events.push(...coup);
      const won = coup.find((e) => e.type === "coup_attempted" && e.succeeded);
      if (won) {
        state.over = { reason: "coup", week: state.week };
        events.push({ type: "run_ended", reason: "coup" });
        break;
      }
      for (const e of coup) {
        if (e.type === "coup_attempted" && !e.succeeded) {
          const c = state.crew.find((x) => x.id === e.crewId);
          if (c) c.status = "dead";
        }
      }

      const nextRank = RANKS[rankIndex(state.rank) + 1];
      if (nextRank && state.standing >= RANK_STANDING[nextRank]) {
        state.rank = nextRank;
        events.push({ type: "player_promoted", to: nextRank });
      }

      state.week += 1;
      events.push({ type: "week_began", week: state.week });
      break;
    }
  }

  saveRng(state, rng);
  return rejected ? { events, rejected } : { events };
}

/** Immutable step for UI code. */
export function step(
  state: GameState,
  cmd: Command,
  config: SimConfig,
): { state: GameState; events: GameEvent[]; rejected?: string } {
  const next = structuredClone(state);
  const result = stepMutable(next, cmd, config);
  return result.rejected
    ? { state: next, events: result.events, rejected: result.rejected }
    : { state: next, events: result.events };
}

// Associates have 0, Soldiers have 2, Capos have 5, Underboss 8, Boss 12
export const crewCap = (rank: Rank): number =>
  [0, 2, 5, 8, 12][rankIndex(rank)] ?? 0;

/** Replay a command list from a seed. Same input, same output, always. */
export function replay(
  seed: string,
  commands: Command[],
  config: SimConfig,
  options: NewGameOptions,
): { state: GameState; events: GameEvent[] } {
  const state = createGame(seed, config, options);
  const events: GameEvent[] = [];
  for (const cmd of commands) {
    events.push(...stepMutable(state, cmd, config).events);
  }
  return { state, events };
}