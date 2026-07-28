import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import { round1 } from "./ledger";
import { backingFor, shiftRegard } from "./relations";
import {
  chainOfCommand,
  isActive,
  me,
  memberById,
  peersOf,
  playerFamily,
  reportsTo,
  exposedTo,
} from "../selectors";
import {
  RANKS,
  rankIndex,
  type Crew,
  type Family,
  type GameState,
  type Rank,
  type Secret,
} from "../types";

const SECRETS: readonly Secret[] = [
  "none",
  "none",
  "none",
  "gambling_debts",
  "skimming",
  "a_body_of_their_own",
  "talking_to_feds",
];

/** Men do not arrive at the top green. Rank buys ability and knowledge. */
const RANK_MOD: Record<Rank, number> = {
  associate: 0,
  soldier: 6,
  capo: 14,
  underboss: 22,
  boss: 30,
};

export interface CrewSeed {
  id: string;
  name: string;
  familyId: string;
  superiorId: string | null;
  rank: Rank;
  isPlayer?: boolean;
  week?: number;
  factionId?: string;
}

export function makeCrew(rng: Rng, seed: CrewSeed): Crew {
  const mod = RANK_MOD[seed.rank];
  const made = seed.rank !== "associate";

  if (seed.isPlayer) {
    return {
      id: seed.id,
      name: seed.name,
      familyId: seed.familyId,
      superiorId: seed.superiorId,
      rank: seed.rank,
      consigliere: false,
      competence: rng.stat(50, 12),
      loyalty: 60,
      ambition: 55,
      discretion: rng.stat(50, 12),
      grudges: 0,
      regard: 0,
      bonds: [],
      factionId: "player",
      knowledge: 4,
      earnings: 0,
      status: "active",
      secret: "none",
      weeksSinceReassured: 0,
      isPlayer: true,
      madeWeek: null,
    };
  }

  return {
    id: seed.id,
    name: seed.name,
    familyId: seed.familyId,
    superiorId: seed.superiorId,
    rank: seed.rank,
    consigliere: false,
    competence: rng.stat(46 + mod, 24),
    loyalty: rng.stat(60 + Math.round(mod / 3), 20),
    ambition: rng.stat(46 + Math.round(mod / 2), 28),
    discretion: rng.stat(50 + Math.round(mod / 2), 24),
    grudges: 0,
    // Strangers start indifferent to you. Everything after that is earned.
    regard: rng.stat(50, 14) - 50,
    bonds: [],
    factionId: seed.factionId ?? seed.superiorId ?? seed.id,
    knowledge: seed.rank === "boss" ? rng.stat(95, 4) : rng.stat(8 + mod * 2, 12),
    earnings: 0,
    status: "active",
    secret: rng.pick(SECRETS),
    weeksSinceReassured: 0,
    isPlayer: false,
    madeWeek: made ? 0 : null,
  };
}

export const activeMembers = (f: Family): Crew[] => f.members.filter((c) => c.status === "active");

/**
 * The number that decides whether someone moves on the man above him.
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

/**
 * Loyalty erosion for one family. Runs for every family in the city, so the
 * other four are drifting toward their own succession crises while you work.
 */
export function weeklyLoyaltyDrift(
  state: GameState,
  family: Family,
  pressure: number,
  rng: Rng,
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const c of activeMembers(family)) {
    if (c.isPlayer) continue;
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
    // Capable and ambitious but going nowhere under the man above him.
    const boss = memberById(state, c.superiorId);
    if (
      boss &&
      c.competence > 60 &&
      c.ambition > 60 &&
      rankIndex(c.rank) < rankIndex(boss.rank) - 1
    ) {
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
      events.push({
        type: "loyalty_shifted",
        crewId: c.id,
        familyId: family.id,
        delta: actual,
        cause,
      });
    }

    // Visible warning signs. The player is meant to be able to see it coming.
    const threat = coupThreat(c);
    if (threat > 0.34 && rng.chance(0.12)) {
      events.push({
        type: "crew_grumbled",
        crewId: c.id,
        familyId: family.id,
        about: c.grudges > 0 ? "being passed over" : "his end of the take",
      });
    }
    if (c.secret === "talking_to_feds" && rng.chance(0.05)) {
      events.push({
        type: "secret_surfaced",
        crewId: c.id,
        familyId: family.id,
        secret: c.secret,
      });
    }
  }

  return events;
}

/**
 * How dangerous a man is *to you*, specifically. Regard is the whole story: a
 * man who thinks well of you will not move on you almost regardless of how
 * ambitious he is, and a man who hates you will move on you at twice the rate
 * the raw numbers suggest. This is the pressure valve the political layer
 * controls — it is why sitting down with people keeps you alive.
 */
export function threatToPlayer(c: Crew): number {
  return coupThreat(c) * clamp(1 - c.regard / 60, 0.08, 2.4);
}

/**
 * Nobody moves on the boss from four rungs down. A man moves on the man
 * directly above him — which is why every promotion you take also hands
 * somebody a target.
 */
export function checkCoup(state: GameState, family: Family, rng: Rng): GameEvent[] {
  const crew = activeMembers(family);

  for (const c of rng.shuffle(crew)) {
    if (c.isPlayer) continue;
    const target = memberById(state, c.superiorId);
    if (!isActive(target)) continue;

    const threat = target.isPlayer ? threatToPlayer(c) : coupThreat(c);
    if (threat < 0.44) continue;
    if (!rng.chance((threat - 0.42) * 0.16)) continue;

    // Backing comes from everyone under the same man who is also unhappy, and
    // from his own camp. Faction is thicker than the chart.
    const siblings = crew.filter((o) => o.superiorId === target.id && o.id !== c.id);
    const backing =
      siblings.reduce((s, o) => s + (o.loyalty < 45 ? o.competence / 100 : 0), 0) +
      crew.reduce(
        (s, o) => s + (o.id !== c.id && o.factionId === c.factionId ? o.competence / 200 : 0),
        0,
      );
    // Against the player, defence is not the chart — it is everyone who likes
    // you enough to stand in the way.
    const defence = target.isPlayer
      ? target.competence / 100 + backingFor(state, "player")
      : target.competence / 100 +
        siblings.reduce((s, o) => s + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);

    const attack = c.competence / 100 + backing;
    const succeeded = attack > defence + 0.6 || rng.chance(0.2);

    return [
      {
        type: "coup_attempted",
        crewId: c.id,
        targetId: target.id,
        familyId: family.id,
        succeeded,
      },
      ...resolveCoup(state, family, c, target, succeeded),
    ];
  }

  return [];
}

/**
 * Succession, properly. The winner takes the loser's seat and inherits his
 * people — a soldier who kills his capo becomes a capo, not the boss.
 */
export function resolveCoup(
  state: GameState,
  family: Family,
  usurper: Crew,
  target: Crew,
  succeeded: boolean,
): GameEvent[] {
  const events: GameEvent[] = [];

  if (!succeeded) {
    usurper.status = "dead";
    if (usurper.isPlayer) {
      state.over = { reason: "coup", week: state.week, detail: "failed_move" };
      events.push({ type: "run_ended", reason: "coup" });
      return events;
    }
    for (const m of activeMembers(family)) {
      if (m.superiorId === target.id) {
        m.loyalty = clamp(round1(m.loyalty - 4), 0, 100);
      }
    }
    // Whoever else was underneath and unhappy just watched what happens.
    for (const m of activeMembers(family)) {
      if (m.superiorId === usurper.id) m.superiorId = target.id;
    }
    return events;
  }

  target.status = "dead";

  if (target.isPlayer) {
    state.over = { reason: "coup", week: state.week, detail: "from_below" };
    events.push({ type: "run_ended", reason: "coup" });
    return events;
  }

  const wasBoss = family.bossId === target.id;
  usurper.rank = target.rank;
  usurper.consigliere = false;
  usurper.superiorId = target.superiorId;
  usurper.ambition = clamp(usurper.ambition + 8, 0, 100);
  usurper.knowledge = clamp(usurper.knowledge + 15, 0, 100);
  usurper.grudges = 0;

  for (const m of family.members) {
    if (m.id === usurper.id) continue;
    if (m.superiorId === target.id) {
      m.superiorId = usurper.id;
      if (m.isPlayer) {
        events.push({ type: "crew_reassigned", crewId: m.id, toSuperiorId: usurper.id });
      }
    }
  }

  if (wasBoss) {
    family.bossId = usurper.id;
    family.reputation = clamp(family.reputation - 8, 0, 100);
    events.push({ type: "boss_killed", familyId: family.id, victimId: target.id, by: usurper.id });
  }
  if (family.underbossId === target.id) family.underbossId = usurper.id;
  if (family.consigliereId === target.id) {
    family.consigliereId = usurper.id;
    usurper.consigliere = true;
  }

  return events;
}

/** Fill a seat that nothing is sitting in, so a family never rots headless. */
export function backfillSeats(state: GameState, family: Family, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const pool = (rank: Rank): Crew[] =>
    activeMembers(family)
      .filter((m) => !m.isPlayer && m.rank === rank)
      .sort((a, b) => b.competence + b.ambition - (a.competence + a.ambition));

  if (!isActive(memberById(state, family.bossId))) {
    const heir = pool("underboss")[0] ?? pool("capo")[0];
    if (heir) {
      heir.rank = "boss";
      heir.superiorId = null;
      heir.consigliere = false;
      family.bossId = heir.id;
      events.push({ type: "seat_filled", familyId: family.id, crewId: heir.id, rank: "boss" });
    }
  }
  if (!isActive(memberById(state, family.underbossId))) {
    const heir = pool("capo")[0];
    if (heir && heir.id !== family.bossId) {
      heir.rank = "underboss";
      heir.superiorId = family.bossId;
      family.underbossId = heir.id;
      for (const m of activeMembers(family)) {
        if (m.rank === "capo" && m.id !== heir.id) m.superiorId = heir.id;
      }
      events.push({ type: "seat_filled", familyId: family.id, crewId: heir.id, rank: "underboss" });
    }
  }
  if (!isActive(memberById(state, family.consigliereId))) {
    const heir = rng.shuffle(pool("capo").filter((m) => m.id !== family.underbossId))[0];
    if (heir) {
      heir.consigliere = true;
      heir.superiorId = family.bossId;
      family.consigliereId = heir.id;
    }
  }

  return events;
}

/** On indictment, the men decide whether you are worth going to prison for. */
export function resolveIndictment(state: GameState, rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const fam = playerFamily(state);

  for (const c of exposedTo(state)) {
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
      events.push({ type: "crew_flipped", crewId: c.id, familyId: fam.id, testimonialDump: dump });
    } else {
      c.status = "arrested";
      events.push({ type: "crew_arrested", crewId: c.id, familyId: fam.id });
    }
  }

  return events;
}

/** The player promoting one of his own. Never above himself. */
export function promote(state: GameState, crewId: string): GameEvent[] {
  const fam = playerFamily(state);
  const target = fam.members.find((c) => c.id === crewId);
  if (!target || target.status !== "active" || target.isPlayer) return [];

  const ceiling = rankIndex(me(state).rank) - 1;
  const next = RANKS[Math.min(rankIndex(target.rank) + 1, ceiling)];
  if (!next || rankIndex(next) <= rankIndex(target.rank)) return [];

  const events: GameEvent[] = [];
  target.rank = next;
  target.loyalty = clamp(target.loyalty + 14, 0, 100);
  // The permanent cost: you just taught him he can move up.
  target.ambition = clamp(target.ambition + 9, 0, 100);
  target.knowledge = clamp(target.knowledge + 12, 0, 100);
  target.weeksSinceReassured = 0;
  if (next === "soldier" && target.madeWeek === null) target.madeWeek = state.week;
  events.push({ type: "crew_promoted", crewId: target.id, familyId: fam.id, to: next });

  // Everyone equally qualified who did not get it remembers.
  for (const other of reportsTo(state, "player")) {
    if (other.id === target.id) continue;
    if (other.competence >= target.competence - 8 && other.ambition > 45) {
      other.grudges += 1;
      other.loyalty = clamp(other.loyalty - 6, 0, 100);
      events.push({
        type: "crew_passed_over",
        crewId: other.id,
        familyId: fam.id,
        inFavourOf: target.id,
      });
    }
  }

  return events;
}

/** How many men of your own a rank entitles you to. */
export const crewCap = (rank: Rank): number => [0, 3, 8, 12, 16][rankIndex(rank)] ?? 0;

/**
 * Taking the rung you were offered. This is the whole climb: the seat you move
 * into, the men who come with it, and the men who wanted it.
 */
export function takePromotion(state: GameState): GameEvent[] {
  const offer = state.offer;
  if (!offer) return [];
  const fam = playerFamily(state);
  const player = me(state);
  const events: GameEvent[] = [];

  const wasPeers = peersOf(state, player);
  player.rank = offer.rank;
  player.knowledge = clamp(player.knowledge + 10, 0, 100);
  if (offer.rank === "soldier" && player.madeWeek === null) player.madeWeek = state.week;

  switch (offer.rank) {
    case "soldier": {
      // A made man answers to a capo, not to the soldier who vouched for him.
      const capo = memberById(state, memberById(state, player.superiorId)?.superiorId ?? null);
      player.superiorId = capo?.id ?? fam.underbossId;
      break;
    }
    case "capo": {
      player.superiorId = fam.underbossId;
      // A capo is given a crew. Men who were somebody else's are now yours.
      const spare = activeMembers(fam)
        .filter((m) => m.rank === "soldier" && m.superiorId !== "player" && !m.isPlayer)
        .slice(0, 3);
      for (const m of spare) {
        m.superiorId = "player";
        m.loyalty = clamp(m.loyalty - 5, 0, 100); // they did not choose you
        events.push({ type: "crew_reassigned", crewId: m.id, toSuperiorId: "player" });
      }
      break;
    }
    case "underboss": {
      player.superiorId = fam.bossId;
      const sitting = memberById(state, fam.underbossId);
      if (sitting && !sitting.isPlayer && sitting.status === "active") {
        // Moved aside, not removed. He goes back to running a crew, and he
        // now has the two things that make a man dangerous: a grudge and men.
        sitting.rank = "capo";
        sitting.superiorId = "player";
        sitting.grudges += 2;
        sitting.loyalty = clamp(sitting.loyalty - 20, 0, 100);
        events.push(...shiftRegard(state, sitting.id, -55, "you took his chair"));
        events.push({
          type: "crew_passed_over",
          crewId: sitting.id,
          familyId: fam.id,
          inFavourOf: "player",
        });
      }
      fam.underbossId = "player";
      for (const m of activeMembers(fam)) {
        if (m.rank === "capo" && !m.isPlayer) m.superiorId = "player";
      }
      break;
    }
    case "boss": {
      player.superiorId = null;
      fam.bossId = "player";
      for (const m of activeMembers(fam)) {
        if (m.rank === "underboss" || m.consigliere) m.superiorId = "player";
      }
      break;
    }
    default:
      break;
  }

  events.push({ type: "player_promoted", to: offer.rank });

  // The men you stepped over, and their camps. This is where your next coup
  // comes from, and it is why a promotion you have not paid for politically is
  // the most dangerous thing you can accept.
  for (const p of wasPeers) {
    if (p.ambition > 45 && p.competence >= player.competence - 12) {
      p.grudges += 1;
      p.loyalty = clamp(p.loyalty - 7, 0, 100);
      events.push(...shiftRegard(state, p.id, -35, "you took what he wanted"));
      for (const ally of activeMembers(fam)) {
        if (ally.id !== p.id && !ally.isPlayer && ally.factionId === p.factionId) {
          events.push(...shiftRegard(state, ally.id, -12, `he came up with ${p.name}`));
        }
      }
      events.push({
        type: "crew_passed_over",
        crewId: p.id,
        familyId: fam.id,
        inFavourOf: "player",
      });
    }
  }

  // Your own camp now runs through you.
  for (const m of reportsTo(state, "player")) m.factionId = "player";

  state.offer = null;
  return events;
}

/**
 * The third way up. You can wait to be offered a seat, you can buy your way
 * into the room — or you can take the chair off the man sitting in it, using
 * the same arithmetic the sim uses against you. Your own men decide it: this
 * is the one move that pays back every envelope you ever handed out.
 */
export function moveOnSuperior(state: GameState, rng: Rng): GameEvent[] {
  const fam = playerFamily(state);
  const player = me(state);
  const target = memberById(state, player.superiorId);
  if (!isActive(target)) return [];

  const mine = reportsTo(state, "player");
  const backing = mine.reduce((s, o) => s + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);
  const his = fam.members.filter(
    (o) => o.status === "active" && o.superiorId === target.id && !o.isPlayer,
  );
  const defence =
    target.competence / 100 + his.reduce((s, o) => s + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);

  const attack = player.competence / 100 + backing;
  const succeeded = attack > defence + 0.4 || rng.chance(0.15);

  const events: GameEvent[] = [
    {
      type: "coup_attempted",
      crewId: "player",
      targetId: target.id,
      familyId: fam.id,
      succeeded,
    },
    ...resolveCoup(state, fam, player, target, succeeded),
  ];

  if (succeeded) {
    // The house saw what you are now. Everyone recalculates.
    for (const m of activeMembers(fam)) {
      if (m.isPlayer) continue;
      m.loyalty = clamp(round1(m.loyalty - 3), 0, 100);
      if (m.ambition > 65) m.grudges += 1;
    }
    state.standing += 25;
  }

  return events;
}

/** How likely your move is to land, so the player can see the odds. */
export function moveOdds(state: GameState): number {
  const fam = playerFamily(state);
  const player = me(state);
  const target = memberById(state, player.superiorId);
  if (!isActive(target)) return 0;
  const mine = reportsTo(state, "player");
  const backing = mine.reduce((s, o) => s + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);
  const his = fam.members.filter(
    (o) => o.status === "active" && o.superiorId === target.id && !o.isPlayer,
  );
  const defence =
    target.competence / 100 + his.reduce((s, o) => s + (o.loyalty >= 55 ? o.competence / 100 : 0), 0);
  return clamp((player.competence / 100 + backing - defence - 0.4 + 1) / 2, 0.15, 0.95);
}

/** Paying tribute up the chain: the other way to be noticed. */
export function kickUp(state: GameState, amount: number): GameEvent[] {
  const superior = chainOfCommand(state)[0];
  if (!superior) return [];
  superior.earnings += amount;
  superior.loyalty = clamp(superior.loyalty + 2, 0, 100);
  superior.weeksSinceReassured = 0;
  return [{ type: "kicked_up", toId: superior.id, amount }];
}