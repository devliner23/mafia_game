import type { Origin } from "./history/eras";
import type { Heritage } from "./history/people";
import type { RacketId } from "./history/houses";

export const RANKS = ["associate", "soldier", "capo", "underboss", "boss"] as const;
export type Rank = (typeof RANKS)[number];

export const rankIndex = (r: Rank): number => RANKS.indexOf(r);

/**
 * What a rank is called out loud. The consigliere is a title, not a rung.
 *
 * These are the New York words. Chicago and Palermo call the same rungs
 * different things, and those live on the Setting in history/eras.ts — read
 * them from there for anything the player sees. This map stays as the neutral
 * fallback for logs and internals.
 */
export const RANK_LABEL: Record<Rank, string> = {
  associate: "associate",
  soldier: "soldier",
  capo: "capo",
  underboss: "underboss",
  boss: "boss",
};

export type EvidenceTrack = "physical" | "financial" | "testimonial";

export interface Ledger {
  physical: number;
  financial: number;
  testimonial: number;
}

/**
 * `in_the_junk` is new, and it is era-shaped: the families banned narcotics and
 * their soldiers dealt anyway, so it is a secret in exactly the years the ban
 * existed. The era's secret weighting in history/people.ts decides how often it
 * comes up.
 */
export type Secret =
  | "none"
  | "gambling_debts"
  | "talking_to_feds"
  | "skimming"
  | "a_body_of_their_own"
  | "in_the_junk";

export type CrewStatus = "active" | "arrested" | "flipped" | "dead";

/**
 * A tie between two specific men. Ties are what make a single act expensive:
 * you never hurt one person in this game, you hurt everyone attached to him.
 */
export type BondKind = "blood" | "made_together" | "owes" | "owed" | "rival" | "friend";

export interface Bond {
  otherId: string;
  kind: BondKind;
  /** -100 hatred .. +100 would go to prison for him. */
  strength: number;
}

/**
 * One person in the city. There is exactly one of these per human being in the
 * game, including the player, and it lives in exactly one place: the `members`
 * array of the family they belong to. Nothing anywhere copies a Crew.
 */
export interface Crew {
  id: string;
  name: string;
  familyId: string;
  /** Who they answer to. Null only for a sitting boss. */
  superiorId: string | null;
  rank: Rank;
  /** The boss's advisor. Sits beside the chain of command, not on it. */
  consigliere: boolean;
  /** How well they execute jobs. */
  competence: number;
  /** Loyalty to their own superior. Falls on its own; must be maintained. */
  loyalty: number;
  /** How much they want their superior's chair. Rises permanently on promotion. */
  ambition: number;
  /** Low discretion passively bleeds testimonial evidence. */
  discretion: number;
  /** Times passed over for promotion. Permanent. */
  grudges: number;
  /**
   * What this man thinks of *you*, specifically. Separate from loyalty, which
   * is about the man he reports to. Regard is the political currency: it
   * decides who backs you, who sponsors you, and who moves on you.
   * -100 wants you gone .. +100 yours.
   */
  regard: number;
  /** Sparse, meaningful ties to other men. Two to four each, not a matrix. */
  bonds: Bond[];
  /** Whose camp he is in — the id of the capo or underboss he came up under. */
  factionId: string;
  /** How much of the operation they could testify about. */
  knowledge: number;
  earnings: number;
  status: CrewStatus;
  secret: Secret;
  weeksSinceReassured: number;
  isPlayer: boolean;
  /** The week they were straightened out. Null while still an associate. */
  madeWeek: number | null;

  /* ------------------------------------------------------------------ the man
   * Everything below is filled by dress() in history/people.ts immediately
   * after makeCrew, so a man generated in 1931 is a 1931 man. All optional:
   * a Crew built without the second pass still satisfies the type, it just
   * has no biography.
   */

  /** True for a documented person seated from the corpus, not invented. */
  historical?: boolean;
  /** Year of birth, derived from rank and date rather than authored. */
  born?: number;
  /** Seventy per cent of made men in 1930; under ten by 1976. */
  bornAbroad?: boolean;
  /** Display label: "Sicilian", "Irish", "Palermitano". */
  ethnicity?: string;
  /**
   * Decides whether he can ever be initiated. In New York and Palermo this is
   * a hard ceiling, and an associate who can never be made plays a materially
   * different game from one who is waiting his turn.
   */
  heritage?: Heritage;
  /** The legitimate work on paper. It is where the heat lands. */
  front?: string;
  /** "Korea", "the Pacific" — derived from birth year, never authored. */
  service?: string | null;
  /** 1-3 trait ids from history/people.ts. Every one of them moved a stat. */
  traits?: string[];
  /** Years spent as an associate. In the closed-books eras this is the story. */
  waited?: number;
  /** "44 · Sicilian, born there · a barber shop" — one line for the crew card. */
  summary?: string;
}

export interface Family {
  id: string;
  /** What it is called *this year*. Changes mid-run when history says so. */
  name: string;
  /** Stable id in the corpus, which never changes even when the name does. */
  houseId: string;
  /** What it will be called by the end, if the run lasts. For the feed only. */
  modernName: string;
  bossId: string;
  underbossId: string;
  consigliereId: string;
  /**
   * A real man sitting in the underboss chair doing the boss's public business.
   * Null for every house that did not run that arrangement — which is all of
   * them except the Genovese family after 1969.
   */
  frontBossId: string | null;
  /** Set when history turns the house on itself. The id of the rebel faction. */
  splitFactionId?: string | null;
  members: Crew[];
  reputation: number;
  heat: number;
  /**
   * How this family stands with each other family, by id.
   * -100 shooting .. -50 open war .. 0 business .. +60 allied.
   * Kept symmetric through setRelation().
   */
  relations: Record<string, number>;
  /** Why it stands there, where the era stated a reason. For the intake dossier. */
  relationWhy: Record<string, string>;
  /** Where it actually sat. Shown, never simulated. */
  turf: string[];
  /** What it lived on, intersected with what still paid that year. */
  rackets: string[];
}

/**
 * Origins replaced backgrounds. They are era-scoped content now — "union hand"
 * means something different in 1931 and 1985, and "off the boat" means nothing
 * at all by 1990 — so the list lives in history/eras.ts rather than here.
 */
export type OriginId = string;

/** @deprecated Kept so older imports still resolve. Use Origin. */
export type Background = Origin;
/** @deprecated Kept so older imports still resolve. Use OriginId. */
export type BackgroundId = OriginId;

export interface NewGameOptions {
  name: string;
  eraId: string;
  houseId: string;
  origin: OriginId;
  entryRank: Rank;
}

/**
 * A seat has opened, or you have earned the next rung, and somebody senior is
 * willing to put your name forward. It sits on the table until you take it.
 */
export interface PromotionOffer {
  rank: Rank;
  sponsorId: string;
  offeredWeek: number;
}

/**
 * A moment where the game stops and asks you something. Situations are the
 * spine of the political layer: every one of them is a choice between people,
 * and every option pays somebody and charges somebody else.
 */
export type SituationKind =
  | "shortfall"
  | "friend_marked"
  | "skimmer"
  | "flip_rumour"
  | "rival_route"
  | "peer_campaign"
  | "boss_envelope"
  | "vouch_request"
  | "war_levy"
  | "sitdown_called";

export interface SituationOption {
  id: string;
  label: string;
  /** What it plainly costs. The hidden part is who remembers it. */
  hint: string;
}

export interface Situation {
  id: string;
  kind: SituationKind;
  week: number;
  /** Who is asking, who it is about, and which house is involved. */
  fromId: string;
  aboutId: string | null;
  familyId: string | null;
  text: string;
  options: SituationOption[];
  /** Weeks before silence becomes its own answer. */
  expiresWeek: number;
}

export interface GameState {
  /** Identity only. Everything about the player as a person is in the roster. */
  player: { id: "player"; name: string; origin: OriginId };
  seed: string;
  week: number;
  money: number;
  ledger: Ledger;
  /** Every family in the city, including the player's. The whole cast. */
  families: Family[];
  playerFamilyId: string;

  eraId: string;
  houseId: string;
  playerHeritage: Heritage;

  standing: number;
  heatMemory: number;
  crewRep: Record<string, number>;
  offer: PromotionOffer | null;
  /** At most one open question at a time. The week cannot end under it. */
  pending: Situation | null;
  nextSituationId: number;
  /** Week each kind last came up, so the same question isn't asked twice running. */
  lastRaised: Partial<Record<SituationKind, number>>;
  over: {
    reason: "coup" | "indicted" | "retired";
    week: number;
    /** How the coup happened, so the closing line can tell the truth. */
    detail?: "from_below" | "failed_move";
  } | null;
  rngState: number;
  nextCrewId: number;
}

export interface Job {
  id: string;
  name: string;
  minRank: Rank;
  crewNeeded: number;
  /**
   * Authored in 1985 dollars, always. The simulation holds one currency and
   * one price level; the era conversion happens at the edge, in the UI, via
   * moneyIn() in era.ts. Doing it the other way round means every balance
   * number in the game has a year attached to it, and they start disagreeing.
   */
  payout: number;
  difficulty: number;
  evidence: Ledger;
  /**
   * Which racket this is. Gated against what still paid that year — liquor
   * stops appearing in the work list in the week of repeal, mid-run.
   */
  racket: RacketId;
  familyId: number | null;
}