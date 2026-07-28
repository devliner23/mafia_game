import { FAMILY_NAMES, NameBook } from "./names";
import type { Rng } from "./rng";
import { makeCrew } from "./systems/crew";
import type { BondKind, Crew, Family, NewGameOptions } from "./types";

/**
 * The whole cast, generated once at intake.
 *
 * Shape follows the real thing: one boss, one underboss, one consigliere
 * beside them, then capos each running a crew of soldiers, with associates
 * hanging off the soldiers. Associates outnumber made men, which is the point —
 * the player starts as one of the many, not as a boss with an empty roster.
 *
 * Everything is drawn from the seeded Rng, so a seed reproduces the city
 * exactly, down to who is sitting in which chair.
 */

export interface City {
  families: Family[];
  playerFamilyId: string;
}

const SIZE = {
  capos: [3, 5] as const,
  soldiersPerCapo: [3, 6] as const,
  associateChance: 0.65,
  associatesPerSoldier: [1, 2] as const,
};

export function generateCity(rng: Rng, options: NewGameOptions): City {
  const book = new NameBook(rng);
  book.reserve(options.name);

  const count = rng.int(4, 5);
  const names = rng.shuffle(FAMILY_NAMES).slice(0, count);
  const families: Family[] = [];

  for (let i = 0; i < count; i++) {
    families.push(buildFamily(rng, `fam_${i}`, names[i] ?? `Family ${i}`, book));
  }

  const home = families[0]!;
  seatPlayer(rng, home, options);

  // Nobody starts as a stranger to everybody. Weave the ties inside each
  // house, then set how the houses stand with one another.
  for (const f of families) weaveBonds(rng, f);
  seedRelations(rng, families);

  return { families, playerFamilyId: home.id };
}

/**
 * Ties. Each made man gets two to four, drawn mostly from the men he works
 * beside, because that is who you actually know. Friends and blood carry
 * positive weight, rivals negative, and every one of them is a channel that
 * your decisions travel down later.
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
      // Ties are mutual, though not always at the same strength.
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
 * How the houses stand at the start. Most pairs are ordinary business; one or
 * two are already sour, so the city has somewhere to go.
 */
function seedRelations(rng: Rng, families: Family[]): void {
  for (const a of families) {
    for (const b of families) {
      if (a.id === b.id) continue;
      if (a.relations[b.id] !== undefined) continue;
      const roll = rng.next();
      const v =
        roll < 0.15 ? -rng.int(30, 55)   // bad blood
        : roll < 0.3 ? rng.int(20, 45)   // friendly
        : rng.int(-15, 15);              // business
      a.relations[b.id] = v;
      b.relations[a.id] = v;
    }
  }
}

function buildFamily(rng: Rng, familyId: string, name: string, book: NameBook): Family {
  const members: Crew[] = [];
  let n = 0;
  const id = (): string => `${familyId}_${++n}`;

  const boss = makeCrew(rng, {
    id: id(),
    name: book.take(),
    familyId,
    superiorId: null,
    rank: "boss",
  });
  members.push(boss);

  const underboss = makeCrew(rng, {
    id: id(),
    name: book.take(),
    familyId,
    superiorId: boss.id,
    rank: "underboss",
  });
  members.push(underboss);

  // The consigliere advises the boss and sits outside the chain of command,
  // which is why he reports to the boss directly and commands nobody.
  const consigliere = makeCrew(rng, {
    id: id(),
    name: book.take(),
    familyId,
    superiorId: boss.id,
    rank: "capo",
  });
  consigliere.consigliere = true;
  consigliere.knowledge = Math.max(consigliere.knowledge, rng.stat(80, 8));
  consigliere.ambition = Math.min(consigliere.ambition, rng.stat(30, 12));
  members.push(consigliere);

  const capoCount = rng.int(SIZE.capos[0], SIZE.capos[1]);
  for (let c = 0; c < capoCount; c++) {
    const capo = makeCrew(rng, {
      id: id(),
      name: book.take(),
      familyId,
      superiorId: underboss.id,
      rank: "capo",
    });
    members.push(capo);

    const soldierCount = rng.int(SIZE.soldiersPerCapo[0], SIZE.soldiersPerCapo[1]);
    for (let s = 0; s < soldierCount; s++) {
      const soldier = makeCrew(rng, {
        id: id(),
        name: book.take(),
        familyId,
        superiorId: capo.id,
        rank: "soldier",
      });
      members.push(soldier);

      if (!rng.chance(SIZE.associateChance)) continue;
      const assocCount = rng.int(SIZE.associatesPerSoldier[0], SIZE.associatesPerSoldier[1]);
      for (let a = 0; a < assocCount; a++) {
        members.push(
          makeCrew(rng, {
            id: id(),
            name: book.take(),
            familyId,
            superiorId: soldier.id,
            rank: "associate",
          }),
        );
      }
    }
  }

  // Everyone came up under somebody. Capos anchor their own camps; the
  // leadership is its own camp.
  for (const m of members) {
    if (m.rank === "boss" || m.rank === "underboss" || m.consigliere) {
      m.factionId = boss.id;
    } else if (m.rank === "capo") {
      m.factionId = m.id;
    } else {
      const sup = members.find((o) => o.id === m.superiorId);
      m.factionId = sup?.rank === "capo" ? sup.id : (sup?.factionId ?? m.id);
    }
  }

  return {
    id: familyId,
    name,
    bossId: boss.id,
    underbossId: underboss.id,
    consigliereId: consigliere.id,
    members,
    reputation: rng.stat(50, 18),
    heat: rng.stat(12, 10),
    relations: {},
  };
}

/**
 * You start where everyone starts: hanging around a soldier in somebody's
 * crew, not on the chart, with four men between you and the boss.
 */
function seatPlayer(rng: Rng, family: Family, options: NewGameOptions): Crew {
  const soldiers = family.members.filter((m) => m.rank === "soldier");
  const mentor = rng.pick(soldiers);

  const player = makeCrew(rng, {
    id: "player",
    name: options.name,
    familyId: family.id,
    superiorId: mentor.id,
    rank: "associate",
    isPlayer: true,
  });

  // You come up under your mentor's capo, like everybody else.
  const capo = family.members.find((m) => m.id === mentor.superiorId);
  player.factionId = capo?.id ?? mentor.id;
  family.members.push(player);
  return player;
}