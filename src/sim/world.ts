import { NameBook } from "./names";
import type { Rng } from "./rng";
import { makeCrew } from "./systems/crew";
import type { BondKind, Crew, Family, NewGameOptions } from "./types";
import {
  bossAt,
  describePerson,
  dress,
  eraById,
  houseById,
  houseNameAt,
  housesInEra,
  seatAt,
  settingById,
  ORIGINS,
  type Era,
  type House,
  type Reign,
  type YM,
} from "./history";

/**
 * The whole cast, generated once at intake — now against a real date.
 *
 * What used to happen here was a shuffle of eight famous surnames. What happens
 * here now is:
 *
 *   the era decides which houses are standing and what they are called that
 *   year (the Gambinos are the Manganos in 1935 and there is no such thing as
 *   the Colombos before 1963);
 *
 *   the corpus decides who is in the top chair, by name, if the record knows —
 *   and the record usually knows the boss, sometimes the underboss, and almost
 *   never the capos, so those are generated;
 *
 *   the era decides how the houses stand with one another on the opening day,
 *   with a stated reason for each pairing, so nothing about the opening
 *   position is arbitrary;
 *
 *   and everything else — the capos, the soldiers, the associates, the ties
 *   between them — is drawn from the seeded Rng exactly as before, because a
 *   hundred and fifty invented men is what makes the twelve real ones legible.
 */

export interface City {
  families: Family[];
  playerFamilyId: string;
}

const SIZE: Record<House["scale"], { capos: readonly [number, number]; soldiers: readonly [number, number] }> = {
  large: { capos: [4, 6], soldiers: [4, 7] },
  mid: { capos: [3, 5], soldiers: [3, 6] },
  small: { capos: [2, 4], soldiers: [2, 5] },
};

const ASSOCIATE_CHANCE = 0.65;

const ymOf = (iso: string): YM => {
  const d = new Date(Date.parse(iso));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1];
};

export function generateCity(rng: Rng, options: NewGameOptions): City {
  const era = eraById(options.eraId);
  if (!era) throw new Error(`No such era: ${options.eraId}`);

  const setting = settingById(era.setting);
  const book = new NameBook(rng, era.setting);
  book.reserve(options.name);

  const at = ymOf(era.start);
  const houses = housesInEra(era);
  const families: Family[] = [];

  for (const house of houses) {
    families.push(buildFamily(rng, house, era, at, book));
  }

  const home =
    families.find((f) => f.houseId === options.houseId) ??
    families[0]!;
  seatPlayer(rng, home, options, era);

  for (const f of families) weaveBonds(rng, f);
  seedRelations(rng, era, families);

  // Houses that everyone can see are finished carry it in their standing.
  for (const f of families) {
    const house = houseById(f.houseId)!;
    f.reputation = clamp100(
      f.reputation + (house.scale === "large" ? 12 : house.scale === "small" ? -8 : 0),
    );
  }

  void setting;
  return { families, playerFamilyId: home.id };
}

/* ------------------------------------------------------------------- a house */

function buildFamily(rng: Rng, house: House, era: Era, at: YM, book: NameBook): Family {
  const year = at[0];

  /**
   * Every man is generated in two passes: makeCrew gives him the numbers his
   * rank implies, and dress() gives him the year. The second pass mutates the
   * first, so a 1931 soldier's discretion is genuinely higher than a 1987
   * soldier's before either of them has a personality — and the traits that
   * follow move the same numbers the rest of the engine reads.
   */
  const born = (crew: Crew, rank: Crew["rank"], historical: boolean): Crew => {
    const facts = dress(rng, crew, { era, year, rank, historical });
    crew.born = facts.born;
    crew.bornAbroad = facts.bornAbroad;
    crew.ethnicity = facts.ethnicity;
    crew.heritage = facts.heritage;
    crew.front = facts.front;
    crew.service = facts.service;
    crew.traits = facts.traits;
    crew.waited = facts.waited;
    crew.summary = describePerson(facts, era);
    return crew;
  };

  const familyId = house.id;
  const members: Crew[] = [];
  let n = 0;
  const id = (): string => `${familyId}_${++n}`;

  /** Seat a documented man if the record has one; otherwise invent one. */
  const nameFor = (reign: Reign | undefined): { name: string; real: boolean } => {
    if (!reign) return { name: book.take(), real: false };
    book.reserve(reign.who);
    return { name: reign.who, real: true };
  };

  const seated = bossAt(house, at);
  const ofRecord = seated.of_record ?? seated.front;
  const front = seated.of_record && seated.front ? seated.front : undefined;

  const bossName = nameFor(ofRecord);
  const boss = born(
    makeCrew(rng, { id: id(), name: bossName.name, familyId, superiorId: null, rank: "boss" }),
    "boss",
    bossName.real,
  );
  boss.historical = bossName.real;
  members.push(boss);

  // A front boss is a real man sitting in the underboss chair doing the boss's
  // public business. Modelling him as an ordinary underboss would lose the one
  // fact that makes the arrangement worth having.
  const ubReign = front ?? seatAt(house, at, "underboss");
  const ubName = nameFor(ubReign);
  const underboss = born(
    makeCrew(rng, { id: id(), name: ubName.name, familyId, superiorId: boss.id, rank: "underboss" }),
    "underboss",
    ubName.real,
  );
  underboss.historical = ubName.real;
  members.push(underboss);

  const cgReign = seatAt(house, at, "consigliere");
  const cgName = nameFor(cgReign);
  const consigliere = born(
    makeCrew(rng, { id: id(), name: cgName.name, familyId, superiorId: boss.id, rank: "underboss" }),
    "underboss",
    cgName.real,
  );
  consigliere.consigliere = true;
  consigliere.historical = cgName.real;
  members.push(consigliere);

  const size = SIZE[house.scale];
  const capoCount = rng.int(size.capos[0], size.capos[1]);

  for (let c = 0; c < capoCount; c++) {
    const capo = born(
      makeCrew(rng, { id: id(), name: book.take(), familyId, superiorId: underboss.id, rank: "capo" }),
      "capo",
      false,
    );
    members.push(capo);

    const soldierCount = rng.int(size.soldiers[0], size.soldiers[1]);
    for (let s = 0; s < soldierCount; s++) {
      const soldier = born(
        makeCrew(rng, {
          id: id(),
          name: book.take(),
          familyId,
          superiorId: capo.id,
          rank: "soldier",
          factionId: capo.id,
        }),
        "soldier",
        false,
      );
      // A man is not made before he is a man. If the roll gave him a birth year
      // that makes him too young for his rank, he is the one who came up fast.
      if (year - soldier.born < 21) soldier.born = year - 21;
      members.push(soldier);

      if (!rng.chance(ASSOCIATE_CHANCE)) continue;
      const assocCount = rng.int(1, 2);
      for (let a = 0; a < assocCount; a++) {
        members.push(
          born(
            makeCrew(rng, {
              id: id(),
              name: book.take(),
              familyId,
              superiorId: soldier.id,
              rank: "associate",
              factionId: capo.id,
            }),
            "associate",
            false,
          ),
        );
      }
    }
  }

  return {
    id: familyId,
    houseId: house.id,
    name: houseNameAt(house, at),
    /** What it will be called later, if the player's run runs that long. */
    modernName: house.names[house.names.length - 1]!.name,
    bossId: boss.id,
    underbossId: underboss.id,
    consigliereId: consigliere.id,
    frontBossId: front ? underboss.id : null,
    members,
    reputation: 50,
    // A house does not start clean. It starts with whatever the year is doing
    // to everyone, plus whatever it has been doing to itself.
    heat: Math.round(era.law.federalAttention / 6),
    relations: {},
    turf: [...house.turf],
    rackets: [...house.rackets],
  };
}

/* -------------------------------------------------------------------- the ties */

/**
 * Ties. Each made man gets two to four, drawn mostly from the men he works
 * beside, because that is who you actually know.
 */
function weaveBonds(rng: Rng, fam: Family): void {
  const pool = fam.members.filter((m) => m.status === "active");

  for (const m of pool) {
    const crewmates = pool.filter((o) => o.id !== m.id && o.superiorId === m.superiorId);
    const count = rng.int(2, 4);

    for (let i = 0; i < count; i++) {
      const candidates = crewmates.length > 0 && rng.chance(0.7) ? crewmates : pool;
      const other = rng.pick(candidates);
      if (other.id === m.id || m.bonds.some((b) => b.otherId === other.id)) continue;

      const roll = rng.next();
      const kind: BondKind =
        roll < 0.08 ? "blood"
        : roll < 0.3 ? "made_together"
        : roll < 0.45 ? "owes"
        : roll < 0.6 ? "owed"
        : roll < 0.8 ? "friend"
        : "rival";
      const strength =
        kind === "blood" ? rng.int(60, 95)
        : kind === "rival" ? -rng.int(30, 80)
        : kind === "made_together" ? rng.int(35, 70)
        : rng.int(20, 55);

      m.bonds.push({ otherId: other.id, kind, strength });
      if (!other.bonds.some((b) => b.otherId === m.id)) {
        other.bonds.push({
          otherId: m.id,
          kind: kind === "owes" ? "owed" : kind === "owed" ? "owes" : kind,
          strength: Math.round(strength * (0.6 + rng.next() * 0.6)),
        });
      }
    }
  }
}

/**
 * How the houses stand on the opening day. Every pairing the era states is
 * taken as written, with its reason preserved for the intake dossier. Pairings
 * the era does not mention are ordinary business with a little noise, because
 * a table where every relationship is authored reads as a diagram.
 */
function seedRelations(rng: Rng, era: Era, families: Family[]): void {
  const stated = new Map<string, { value: number; why: string }>();
  for (const r of era.openingRelations) {
    stated.set(key(r.a, r.b), { value: r.value, why: r.why });
  }

  for (const a of families) {
    for (const b of families) {
      if (a.id === b.id) continue;
      if (a.relations[b.id] !== undefined) continue;

      const said = stated.get(key(a.id, b.id));
      const v = said ? said.value : rng.int(-12, 12);
      a.relations[b.id] = v;
      b.relations[a.id] = v;
      if (said) {
        a.relationWhy[b.id] = said.why;
        b.relationWhy[a.id] = said.why;
      }
    }
  }
}

const key = (a: string, b: string): string => [a, b].sort().join("|");

/* ------------------------------------------------------------------ the player */

/**
 * You come in under a capo, at the rung the era permits. In a closed-books era
 * that is `associate` and nothing else, which is not a balance decision — from
 * December 1957 to the autumn of 1976 nobody in New York was made at all.
 */
function seatPlayer(rng: Rng, fam: Family, options: NewGameOptions, era: Era): void {
  const capos = fam.members.filter((m) => m.rank === "capo" && m.status === "active");
  const capo = capos.length > 0 ? rng.pick(capos) : fam.members[1]!;

  const rank = options.entryRank;
  const superior =
    rank === "associate"
      ? rng.pick(
          fam.members.filter((m) => m.rank === "soldier" && m.superiorId === capo.id),
        ) ?? capo
      : capo;

  const player = makeCrew(rng, {
    id: "player",
    name: options.name,
    familyId: fam.id,
    superiorId: superior.id,
    rank,
    isPlayer: true,
    factionId: capo.id,
  });

  // The player is dressed like everyone else, then corrected: his origin, not
  // the demographic roll, decides where he is from — because that is the choice
  // he made at intake and it is the one that decides whether the ladder has a
  // top for him.
  const year = new Date(Date.parse(era.start)).getUTCFullYear();
  const origin = ORIGINS.find((o) => o.id === options.origin);
  const facts = dress(rng, player, { era, year, rank, isPlayer: true });
  player.born = facts.born;
  player.bornAbroad = origin?.heritage === "sicilian" ? facts.bornAbroad : false;
  player.heritage = origin?.heritage ?? facts.heritage;
  player.ethnicity =
    origin?.heritage === "sicilian" ? "Sicilian"
    : origin?.heritage === "italian" ? facts.ethnicity
    : "not of the blood";
  player.front = facts.front;
  player.service = facts.service;
  player.traits = facts.traits;
  player.waited = 0;
  player.summary = describePerson({ ...facts, heritage: player.heritage, ethnicity: player.ethnicity }, era);
  player.madeWeek = rank === "associate" ? null : 0;
  fam.members.push(player);
}

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));