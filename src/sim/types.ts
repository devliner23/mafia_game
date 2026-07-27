export const RANKS = ["associate", "soldier", "capo", "underboss", "boss"] as const;
export type Rank = (typeof RANKS)[number];

export const rankIndex = (r: Rank): number => RANKS.indexOf(r);

export type EvidenceTrack = "physical" | "financial" | "testimonial";

export interface Ledger {
  physical: number;
  financial: number;
  testimonial: number;
}

export type Secret =
  | "none"
  | "gambling_debts"
  | "talking_to_feds"
  | "skimming"
  | "a_body_of_their_own";

export type CrewStatus = "active" | "arrested" | "flipped" | "dead";

export interface Crew {
  id: string;
  name: string;
  rank: Rank;
  /** How well they execute jobs. */
  competence: number;
  /** How likely they are to stay. Falls on its own; must be maintained. */
  loyalty: number;
  /** How much they want your chair. Rises permanently when promoted. */
  ambition: number;
  /** Low discretion passively bleeds testimonial evidence. */
  discretion: number;
  /** Times passed over for promotion. Permanent. */
  grudges: number;
  /** How much of the operation they could testify about. */
  knowledge: number;
  earnings: number;
  status: CrewStatus;
  secret: Secret;
  weeksSinceReassured: number;
}

export type BackgroundId = "corner" | "union" | "bookmaker";

export interface NewGameOptions {
  name: string;
  background: BackgroundId;
}

export interface Background {
  id: BackgroundId;
  name: string;
  blurb: string;
  money: number;
  standing: number;
  ledger: Ledger;
}

export interface GameState {
  player: { name: string; background: BackgroundId, loyalty: number };
  seed: string;
  week: number;
  rank: Rank;
  money: number;
  ledger: Ledger;
  crew: Crew[];
  standing: number;
  heatMemory: number;
  over: { reason: "coup" | "indicted" | "retired"; week: number } | null;
  rngState: number;
  nextCrewId: number;
  families: Family[];    // All families in the city
  playerFamilyId: string;

}

export interface Job {
  id: string;
  name: string;
  minRank: Rank;
  crewNeeded: number;
  payout: number;
  difficulty: number;
  evidence: Ledger;
}

export interface Crew {
  id: string;
  name: string;
  familyId: string;
  superiorId: string | null; // Who they directly report to
  rank: Rank;
  competence: number;
  loyalty: number;
  ambition: number;
  discretion: number;
  grudges: number;
  knowledge: number;
  earnings: number;
  status: "active" | "flipped" | "arrested" | "dead";
  secret: Secret;
  weeksSinceReassured: number;
}

export interface Family {
  id: string;
  name: string;
  bossId: string;
  members: Crew[];
  reputation: number;
  heat: number;
}

