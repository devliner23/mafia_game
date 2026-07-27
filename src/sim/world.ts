// src/world.ts
import type { Crew, Family, Rank } from "./types";
import type { Rng } from "./rng";

const FIRST_NAMES = ["Vincent", "Salvatore", "Anthony", "Giovanni", "Carmine", "Frank", "Dominic", "Vito", "Paulie", "Luca", "Rocco", "Eddie"];
const LAST_NAMES = ["Corleone", "Soprano", "Gambino", "Lucchese", "Genovese", "Bonanno", "Colombo", "Profaci", "Mangano", "Maranzano"];
const FAMILY_NAMES = ["Gambino", "Genovese", "Lucchese", "Bonanno", "Profaci"];

const SECRETS: readonly Crew["secret"][] = [
  "none", "none", "gambling_debts", "skimming", "a_body_of_their_own", "talking_to_feds",
];

function makeMember(
  rng: Rng,
  familyId: string,
  rank: Rank,
  superiorId: string | null,
  isPlayer = false
): Crew {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  
  // Stat scaling by rank for production balance
  const statMod = rank === "boss" ? 30 : rank === "underboss" ? 20 : rank === "capo" ? 10 : 0;

  return {
    id: isPlayer ? "player" : crypto.randomUUID(),
    name: isPlayer ? "You" : `${first} ${last}`,
    familyId,
    superiorId,
    rank,
    competence: isPlayer ? rng.stat(50, 20) : rng.stat(40 + statMod, 25),
    loyalty: isPlayer ? 50 : rng.stat(50 + statMod, 20),
    ambition: isPlayer ? 40 : rng.stat(40 + statMod, 30),
    discretion: isPlayer ? 50 : rng.stat(40 + statMod, 25),
    grudges: 0,
    knowledge: isPlayer ? 5 : rank === "boss" ? 100 : rng.stat(10 + statMod * 2, 15),
    earnings: 0,
    status: "active",
    secret: isPlayer ? "none" : rng.pick(SECRETS),
    weeksSinceReassured: 0,
  };
}

export function generateCity(rng: Rng): { families: Family[], playerFamily: Family, player: Crew } {
  const families: Family[] = [];
  let player: Crew | null = null;
  let playerFamily: Family | null = null;

  // Generate 3-5 families
  const numFamilies = rng.int(3, 5);
  const chosenNames = rng.shuffle([...FAMILY_NAMES]).slice(0, numFamilies);

  for (let i = 0; i < numFamilies; i++) {
    const familyId = `fam_${i}`;
    const members: Crew[] = [];

    // 1. Boss
    const boss = makeMember(rng, familyId, "boss", null);
    members.push(boss);

    // 2. Underboss
    const underboss = makeMember(rng, familyId, "underboss", boss.id);
    members.push(underboss);

    // 3. Capos (2-4)
    const numCapos = rng.int(2, 4);
    for (let c = 0; c < numCapos; c++) {
      const capo = makeMember(rng, familyId, "capo", underboss.id);
      members.push(capo);

      // 4. Soldiers (3-6 per Capo)
      const numSoldiers = rng.int(3, 6);
      for (let s = 0; s < numSoldiers; s++) {
        const soldier = makeMember(rng, familyId, "soldier", capo.id);
        members.push(soldier);

        // 5. Associates (1-4 per Soldier)
        const numAssociates = rng.int(1, 4);
        for (let a = 0; a < numAssociates; a++) {
          const assoc = makeMember(rng, familyId, "associate", soldier.id);
          members.push(assoc);
        }
      }
    }

    // If it's the first family, insert the player as an associate under a random soldier
    if (i === 0) {
      const soldiers = members.filter(m => m.rank === "soldier");
      const mentor = rng.pick(soldiers);
      player = makeMember(rng, familyId, "associate", mentor.id, true);
      members.push(player);
      
      playerFamily = {
        id: familyId,
        name: chosenNames[i],
        bossId: boss.id,
        members,
        reputation: 50,
        heat: 0,
      };
      families.push(playerFamily);
    } else {
      families.push({
        id: familyId,
        name: chosenNames[i],
        bossId: boss.id,
        members,
        reputation: 50,
        heat: 0,
      });
    }
  }

  return { families, playerFamily: playerFamily!, player: player! };
}