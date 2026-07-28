import type { Command, GameEvent, Step } from "./events";
import { FIRST_NAMES, LAST_NAMES } from "./names";
import { clamp, Rng } from "./rng";
import {
  activeCrew,
  chainOfCommand,
  isActive,
  me,
  memberById,
  playerFamily,
  playerRank,
  seatFilled,
} from "./selectors";
import {
  backfillSeats,
  checkCoup,
  crewCap,
  kickUp,
  makeCrew,
  moveOnSuperior,
  promote,
  resolveIndictment,
  takePromotion,
  weeklyLoyaltyDrift,
} from "./systems/crew";
import {
  addEvidence,
  applyLayLow,
  caseProgress,
  checkIndictment,
  COOLING,
  heatPressure,
  reduceEvidence,
  round1,
  weeklyDrift,
} from "./systems/ledger";
import {
  raiseSituation,
  resolveSituation,
  silenceOption,
} from "./systems/situations";
import {
  WAR,
  playerBacking,
  regardDrift,
  relationBetween,
  relationDrift,
  shiftRegard,
  shiftRelation,
  warWeek,
} from "./systems/relations";
import { generateCity } from "./world";
import {
  RANKS,
  rankIndex,
  type Background,
  type Crew,
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
/** Share of what you're holding that goes up the chain when you kick up. */
export const TRIBUTE_PCT = 0.25;
/** What it costs to have the man above you removed. */
export const MOVE_COST = 6000;
/** What you put on the table to get another house to sit down. */
export const SITDOWN_COST = 8000;

/**
 * The political bar for each rung: how well your sponsor has to think of you,
 * and how much of the house has to be behind you. This is the change that
 * makes the climb a social problem rather than an accounting one.
 */
export const SUPPORT_NEEDED: Record<Rank, { sponsor: number; house: number }> = {
  associate: { sponsor: -100, house: -100 },
  soldier: { sponsor: 10, house: 0.5 },
  capo: { sponsor: 25, house: 2 },
  underboss: { sponsor: 40, house: 5 },
  boss: { sponsor: 45, house: 8 },
};

/** Standing needed before anybody will put your name forward. */
export const RANK_STANDING: Record<Rank, number> = {
  associate: 0,
  soldier: 40,
  capo: 200,
  underboss: 550,
  boss: 1100,
};

export function createGame(
  seed: string,
  config: SimConfig,
  options: NewGameOptions,
): GameState {
  const rng = Rng.fromSeed(seed);
  const bg =
    config.backgrounds.find((b) => b.id === options.background) ?? config.backgrounds[0]!;

  const city = generateCity(rng, options);

  const state: GameState = {
    player: { id: "player", name: options.name, background: bg.id },
    seed,
    week: 1,
    money: bg.money,
    ledger: { ...bg.ledger },
    families: city.families,
    playerFamilyId: city.playerFamilyId,
    standing: bg.standing,
    heatMemory: 0,
    offer: null,
    pending: null,
    nextSituationId: 1,
    lastRaised: {},
    over: null,
    rngState: 0,
    nextCrewId: 1,
  };

  // Where you came from is a man, not a difficulty slider.
  const player = me(state);
  player.competence = clamp(player.competence + bg.stats.competence, 0, 100);
  player.ambition = clamp(player.ambition + bg.stats.ambition, 0, 100);
  player.discretion = clamp(player.discretion + bg.stats.discretion, 0, 100);

  state.rngState = rng.state;
  return state;
}

const rngOf = (s: GameState): Rng => new Rng(s.rngState);
const saveRng = (s: GameState, rng: Rng): void => {
  s.rngState = rng.state;
};

/** Who would put your name forward for the next rung. */
function sponsorFor(state: GameState, next: Rank): Crew | undefined {
  const fam = playerFamily(state);
  const chain = chainOfCommand(state);
  switch (next) {
    case "soldier":
      return chain.find((c) => c.rank === "capo") ?? chain[0];
    case "capo":
      return memberById(state, fam.underbossId) ?? memberById(state, fam.bossId);
    case "underboss":
      return memberById(state, fam.bossId);
    case "boss":
      return memberById(state, fam.consigliereId) ?? memberById(state, fam.underbossId);
    default:
      return undefined;
  }
}

/**
 * The climb. Standing gets your name said in the right room; the top two rungs
 * additionally need the chair to be empty, because nobody is made underboss
 * while there is a living underboss.
 */
function considerPromotion(state: GameState): GameEvent[] {
  if (state.offer || state.over) return [];
  const player = me(state);
  const next = RANKS[rankIndex(player.rank) + 1];
  if (!next) return [];
  if (state.standing < RANK_STANDING[next]) return [];

  const fam = playerFamily(state);
  // The top seats are not vacancies you earn into. An underboss can be moved
  // aside if you are far enough past the bar — and he will remember it — but
  // nobody is handed a boss's chair while the boss is still sitting in it.
  if (next === "underboss" && seatFilled(state, fam.underbossId)) {
    const sitting = memberById(state, fam.underbossId);
    const overwhelming =
      state.standing >= RANK_STANDING.underboss + 150 &&
      !!sitting &&
      player.competence >= sitting.competence - 10;
    if (!overwhelming) return [];
  }
  if (next === "boss" && seatFilled(state, fam.bossId)) return [];

  const sponsor = sponsorFor(state, next);
  if (!isActive(sponsor)) return [];

  // Standing gets your name said. Politics decides whether anyone in the room
  // agrees with it. A sponsor who doesn't rate you will not put his own name
  // behind yours, and the higher the seat, the more of the house you need.
  const needed = SUPPORT_NEEDED[next];
  if (sponsor.regard < needed.sponsor) return [];
  if (playerBacking(state) < needed.house) return [];

  state.offer = { rank: next, sponsorId: sponsor.id, offeredWeek: state.week };
  return [{ type: "promotion_offered", rank: next, sponsorId: sponsor.id }];
}

/** Mutating step. Used by the soak runner where allocation cost matters. */
export function stepMutable(state: GameState, cmd: Command, config: SimConfig): Step {
  if (state.over) return { events: [], rejected: "run is over" };
  const rng = rngOf(state);
  const events: GameEvent[] = [];
  const rank = playerRank(state);
  let rejected: string | undefined;

  switch (cmd.type) {
    case "run_job": {
      const job = config.jobs.find((j) => j.id === cmd.jobId);
      if (!job) {
        rejected = "no such job";
        break;
      }
      if (rankIndex(rank) < rankIndex(job.minRank)) {
        rejected = "rank too low";
        break;
      }
      const team = activeCrew(state).filter((c) => cmd.crewIds.includes(c.id));
      const needed = rank === "associate" ? 0 : job.crewNeeded;
      if (team.length < needed) {
        rejected = "not enough crew";
        break;
      }

      const player = me(state);
      const skill =
        team.length > 0
          ? team.reduce((s, c) => s + c.competence, 0) / team.length
          : player.competence;
      const success = rng.chance(clamp(0.35 + (skill - job.difficulty) / 120, 0.08, 0.95));

      if (success) {
        const payout = Math.round(job.payout * (0.85 + rng.next() * 0.3));
        state.money += payout;
        // The balance surface. Standing has to outrun the cost of cooling off
        // (lay_low is -2) or the ladder is mathematically unclimbable — which
        // is exactly what the soak found at payout/2500.
        state.standing += Math.max(1, Math.round(job.payout / 1200));
        player.earnings += payout;
        player.knowledge = clamp(player.knowledge + 1, 0, 100);
        for (const c of team) {
          c.earnings += Math.round(payout / Math.max(team.length, 1) / 4);
          c.knowledge = clamp(c.knowledge + 1.5, 0, 100);
          // Men who eat because of you think better of you for it.
          events.push(...shiftRegard(state, c.id, 2, "he ate this week"));
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
      playerFamily(state).heat = clamp(playerFamily(state).heat + 1, 0, 100);
      break;
    }

    case "recruit": {
      if (rankIndex(rank) < rankIndex("soldier")) {
        rejected = "associates don't have men — you are one";
        break;
      }
      if (state.money < RECRUIT_COST) {
        rejected = "cannot afford";
        break;
      }
      if (activeCrew(state).length >= crewCap(rank)) {
        rejected = "you can't watch any more of them";
        break;
      }
      state.money -= RECRUIT_COST;
      const id = `c${state.nextCrewId++}`;
      const taken = new Set(playerFamily(state).members.map((m) => m.name));
      let name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      for (let i = 0; i < 20 && taken.has(name); i++) {
        name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      }
      const c = makeCrew(rng, {
        id,
        name,
        familyId: state.playerFamilyId,
        superiorId: "player",
        rank: "associate",
      });
      playerFamily(state).members.push(c);
      events.push({ type: "money_changed", delta: -RECRUIT_COST, reason: "recruiting" });
      events.push({ type: "crew_recruited", crewId: id, name });
      break;
    }

    case "promote":
      events.push(...promote(state, cmd.crewId));
      if (events.some((e) => e.type === "crew_promoted")) {
        events.push(...shiftRegard(state, cmd.crewId, 25, "you moved him up"));
      }
      if (events.length === 0) rejected = "not yours to give";
      break;

    case "take_promotion": {
      if (!state.offer) {
        rejected = "nothing on the table";
        break;
      }
      events.push(...takePromotion(state));
      break;
    }

    case "kick_up": {
      const superior = chainOfCommand(state)[0];
      if (!superior) {
        rejected = "you answer to nobody";
        break;
      }
      const amount = Math.round(state.money * TRIBUTE_PCT);
      if (amount < 500) {
        rejected = "not enough to send up";
        break;
      }
      state.money -= amount;
      state.standing += Math.max(1, Math.round(amount / 1800));
      events.push({ type: "money_changed", delta: -amount, reason: "tribute" });
      events.push(...kickUp(state, amount));
      events.push(...shiftRegard(state, superior.id, Math.min(14, 4 + amount / 4000), "you kicked up"));
      events.push(...shiftRegard(state, playerFamily(state).bossId, 2, "you earn"));
      break;
    }

    case "resolve": {
      if (!state.pending) {
        rejected = "nobody is waiting on you";
        break;
      }
      const valid = state.pending.options.some((o) => o.id === cmd.optionId);
      if (!valid) {
        rejected = "not one of the answers";
        break;
      }
      events.push(...resolveSituation(state, cmd.optionId, rng));
      break;
    }

    case "seek_sitdown": {
      if (rankIndex(rank) < rankIndex("capo")) {
        rejected = "a soldier does not call a sitdown";
        break;
      }
      const fam = playerFamily(state);
      const other = state.families.find((f) => f.id === cmd.familyId);
      if (!other || other.id === fam.id) {
        rejected = "no such house";
        break;
      }
      if (state.money < SITDOWN_COST) {
        rejected = "you don't come to that table empty-handed";
        break;
      }
      state.money -= SITDOWN_COST;
      events.push({ type: "money_changed", delta: -SITDOWN_COST, reason: "a sitdown" });
      // Asking for peace works, and it costs you something at home.
      const gain = relationBetween(fam, other.id) <= WAR ? 30 : 18;
      events.push(...shiftRelation(state, fam.id, other.id, gain, "you asked for a sitdown"));
      for (const m of playerFamily(state).members) {
        if (m.status === "active" && !m.isPlayer && m.ambition > 60) {
          events.push(...shiftRegard(state, m.id, -6, "you talked instead of moving"));
        }
      }
      events.push(...shiftRegard(state, playerFamily(state).bossId, 12, "you brought quiet"));
      break;
    }

    case "make_a_move": {
      if (rankIndex(rank) < rankIndex("soldier")) {
        rejected = "an associate who tries this is just a body";
        break;
      }
      const target = chainOfCommand(state)[0];
      if (!target) {
        rejected = "there is nobody above you";
        break;
      }
      if (state.money < MOVE_COST) {
        rejected = "this kind of work has to be paid for";
        break;
      }
      state.money -= MOVE_COST;
      events.push({ type: "money_changed", delta: -MOVE_COST, reason: "the work" });
      events.push(...moveOnSuperior(state, rng));
      // Bodies are physical evidence, whichever way it goes.
      events.push(...addEvidence(state, "physical", 12, "a body"));
      playerFamily(state).heat = clamp(playerFamily(state).heat + 12, 0, 100);
      break;
    }

    case "reassure": {
      // Your own men, or the man above you. Both need feeding.
      const c = playerFamily(state).members.find(
        (x) => x.id === cmd.crewId && x.status === "active",
      );
      if (!c) {
        rejected = "no such target";
        break;
      }
      if (c.isPlayer) {
        rejected = "cannot reassure yourself";
        break;
      }
      if (state.money < REASSURE_COST) {
        rejected = "cannot afford";
        break;
      }
      state.money -= REASSURE_COST;
      c.loyalty = clamp(c.loyalty + 9, 0, 100);
      c.grudges = Math.max(0, c.grudges - (rng.chance(0.35) ? 1 : 0));
      c.weeksSinceReassured = 0;
      events.push({ type: "money_changed", delta: -REASSURE_COST, reason: "an envelope" });
      events.push({ type: "crew_reassured", crewId: c.id });
      // Time spent on a man is the main thing that buys regard — and it travels
      // to everyone tied to him, which is why who you sit with matters.
      events.push(...shiftRegard(state, c.id, 14, "you came around"));
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
      if (playerRank(state) !== "boss" || state.standing < RANK_STANDING.boss + 120) {
        rejected = "not yet";
        break;
      }
      state.over = { reason: "retired", week: state.week };
      events.push({ type: "run_ended", reason: "retired" });
      break;
    }

    case "end_week": {
      // Silence is an answer. If they asked and you didn't reply, the last
      // option on the list is the one you chose.
      if (state.pending) {
        events.push(...resolveSituation(state, silenceOption(), rng));
      }

      events.push(...weeklyDrift(state, rng));
      events.push(...regardDrift(state, rng));

      // Every family in the city drifts and schemes, not just yours.
      const pressure = heatPressure(state);
      for (const fam of state.families) {
        const local = fam.id === state.playerFamilyId ? pressure : fam.heat / 100;
        events.push(...weeklyLoyaltyDrift(state, fam, local, rng));
        events.push(...warWeek(state, fam, rng));
        events.push(...checkCoup(state, fam, rng));
        events.push(...backfillSeats(state, fam, rng));
        fam.heat = clamp(round1(fam.heat - 0.5), 0, 100);
      }
      relationDrift(state);
      if (state.over) {
        // Somebody underneath you moved first.
        break;
      }

      const indicted = checkIndictment(state);
      if (indicted.length > 0) {
        events.push(...indicted);
        events.push(...resolveIndictment(state, rng));
        if (caseProgress(state) > 1.6) {
          state.over = { reason: "indicted", week: state.week };
          events.push({ type: "run_ended", reason: "indicted" });
          break;
        }
      }

      events.push(...considerPromotion(state));
      // Somebody wants an answer about something before next week.
      if (rng.chance(state.pending ? 0 : 0.3)) {
        events.push(...raiseSituation(state, rng));
      }

      state.heatMemory = round1(Math.max(state.heatMemory * 0.92, pressure));
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