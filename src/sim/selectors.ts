import { rankIndex, type Crew, type Family, type GameState, type Rank } from "./types";

/**
 * The player used to exist twice: once in `state.player` and once inside the
 * family roster, so anything that happened to him in the simulation never
 * reached the UI. There is now one copy, in the roster, and everything reads
 * it through here.
 */

export const playerFamily = (s: GameState): Family =>
  s.families.find((f) => f.id === s.playerFamilyId) ?? s.families[0]!;

export const me = (s: GameState): Crew =>
  playerFamily(s).members.find((m) => m.id === "player")!;

export const playerRank = (s: GameState): Rank => me(s).rank;

export const allMembers = (s: GameState): Crew[] => s.families.flatMap((f) => f.members);

export const memberById = (s: GameState, id: string | null): Crew | undefined =>
  id === null ? undefined : allMembers(s).find((m) => m.id === id);

export const familyById = (s: GameState, id: string): Family | undefined =>
  s.families.find((f) => f.id === id);

export const isActive = (c: Crew | undefined): c is Crew => Boolean(c && c.status === "active");

/** Everyone who answers directly to someone. Defaults to the player's crew. */
export const reportsTo = (s: GameState, id = "player"): Crew[] =>
  playerFamily(s).members.filter((m) => m.superiorId === id && m.status === "active");

export const activeCrew = (s: GameState): Crew[] => reportsTo(s, "player");

export const superiorOf = (s: GameState, c: Crew): Crew | undefined =>
  memberById(s, c.superiorId);

/** You, then your capo, then his underboss, then the boss. */
export function chainOfCommand(s: GameState): Crew[] {
  const chain: Crew[] = [];
  let cur = superiorOf(s, me(s));
  let guard = 0;
  while (cur && guard++ < 8) {
    chain.push(cur);
    cur = superiorOf(s, cur);
  }
  return chain;
}

/** Men on your level under the same boss — the ones who resent your promotion. */
export function peersOf(s: GameState, c: Crew): Crew[] {
  return playerFamily(s).members.filter(
    (m) => m.id !== c.id && m.status === "active" && m.superiorId === c.superiorId,
  );
}

/** Your crew, their crews, and everyone above you. Who could hurt you. */
export function exposedTo(s: GameState): Crew[] {
  const fam = playerFamily(s);
  const out = new Map<string, Crew>();
  const walk = (id: string, depth: number): void => {
    if (depth > 3) return;
    for (const m of fam.members) {
      if (m.superiorId === id && m.status === "active" && !m.isPlayer) {
        out.set(m.id, m);
        walk(m.id, depth + 1);
      }
    }
  };
  walk("player", 0);
  for (const c of chainOfCommand(s)) out.set(c.id, c);
  return [...out.values()];
}

export const leadership = (
  s: GameState,
  fam: Family,
): { boss: Crew | undefined; underboss: Crew | undefined; consigliere: Crew | undefined } => ({
  boss: memberById(s, fam.bossId),
  underboss: memberById(s, fam.underbossId),
  consigliere: memberById(s, fam.consigliereId),
});

export const headcount = (fam: Family): Record<Rank, number> => {
  const out: Record<Rank, number> = { associate: 0, soldier: 0, capo: 0, underboss: 0, boss: 0 };
  for (const m of fam.members) if (m.status === "active") out[m.rank] += 1;
  return out;
};

/** A seat only opens when the man in it stops being able to sit in it. */
export const seatFilled = (s: GameState, id: string): boolean => isActive(memberById(s, id));

export const outranks = (a: Crew, b: Crew): boolean => rankIndex(a.rank) > rankIndex(b.rank);