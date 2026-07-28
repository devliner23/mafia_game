export const RANKS = ["associate", "soldier", "capo", "underboss", "boss"] as const;
export type Rank = (typeof RANKS)[number];

export const rankIndex = (r: Rank): number => RANKS.indexOf(r);

/** What a rank is called out loud. The consigliere is a title, not a rung. */
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

export type Secret =
  | "none"
  | "gambling_debts"
  | "talking_to_feds"
  | "skimming"
  | "a_body_of_their_own";

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
}

export interface Family {
  id: string;
  name: string;
  bossId: string;
  underbossId: string;
  consigliereId: string;
  members: Crew[];
  reputation: number;
  heat: number;
  /**
   * How this family stands with each other family, by id.
   * -100 shooting .. -50 open war .. 0 business .. +60 allied.
   * Kept symmetric through setRelation().
   */
  relations: Record<string, number>;
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
  /** Modifiers on the man you start as, so the pick reads as a person. */
  stats: { competence: number; ambition: number; discretion: number };
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
  player: { id: "player"; name: string; background: BackgroundId };
  seed: string;
  week: number;
  money: number;
  ledger: Ledger;
  /** Every family in the city, including the player's. The whole cast. */
  families: Family[];
  playerFamilyId: string;
  standing: number;
  heatMemory: number;
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
  payout: number;
  difficulty: number;
  evidence: Ledger;
}