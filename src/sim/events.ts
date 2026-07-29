import type { EvidenceTrack, Rank, Secret, SituationKind } from "./types";

/**
 * Commands are what the player asks for. They may be rejected.
 */
export type Command =
  | { type: "run_job"; jobId: string; crewIds: string[] }
  | { type: "recruit" }
  | { type: "promote"; crewId: string }
  | { type: "reassure"; crewId: string }
  | { type: "kick_up" }
  | { type: "make_a_move" }
  | { type: "resolve"; optionId: string }
  | { type: "seek_sitdown"; familyId: string }
  | { type: "take_promotion" }
  | { type: "launder" }
  | { type: "cleanup" }
  | { type: "lay_low" }
  | { type: "retire" }
  | { type: "end_week" };

/**
 * Events are what actually happened. State is a fold over these, and the
 * street feed is a separate projection over the same stream — which is why
 * the feed can never drift out of sync with the simulation.
 *
 * Anything that happens to a person carries `familyId`, so the feed can tell
 * the difference between your own crew and news from across town.
 */
export type GameEvent =
  | { type: "week_began"; week: number }
  | { type: "job_succeeded"; jobId: string; crewIds: string[]; payout: number }
  | { type: "job_failed"; jobId: string; crewIds: string[] }
  | { type: "evidence_added"; track: EvidenceTrack; amount: number; cause: string }
  | { type: "evidence_reduced"; track: EvidenceTrack; amount: number; how: string }
  | { type: "money_changed"; delta: number; reason: string }
  | { type: "crew_recruited"; crewId: string; name: string }
  | { type: "crew_promoted"; crewId: string; familyId: string; to: Rank }
  | { type: "crew_passed_over"; crewId: string; familyId: string; inFavourOf: string }
  | { type: "crew_reassigned"; crewId: string; toSuperiorId: string }
  | { type: "loyalty_shifted"; crewId: string; familyId: string; delta: number; cause: string }
  | { type: "crew_reassured"; crewId: string }
  | { type: "kicked_up"; toId: string; amount: number }
  | { type: "secret_surfaced"; crewId: string; familyId: string; secret: Secret }
  | { type: "crew_grumbled"; crewId: string; familyId: string; about: string }
  | { type: "coup_attempted"; crewId: string; targetId: string; familyId: string; succeeded: boolean }
  | { type: "boss_killed"; familyId: string; victimId: string; by: string }
  | { type: "seat_filled"; familyId: string; crewId: string; rank: Rank }
  | { type: "promotion_offered"; rank: Rank; sponsorId: string }
  | { type: "indictment_filed"; weight: number }
  | { type: "crew_arrested"; crewId: string; familyId: string }
  | { type: "crew_flipped"; crewId: string; familyId: string; testimonialDump: number }
  | { type: "player_promoted"; to: Rank }
  | { type: "run_ended"; reason: "coup" | "indicted" | "retired" }
  // --- politics ---
  | { type: "regard_shifted"; crewId: string; delta: number; reason: string }
  | { type: "relation_shifted"; familyId: string; withFamilyId: string; value: number; reason: string }
  | { type: "war_declared"; familyId: string; withFamilyId: string }
  | { type: "peace_made"; familyId: string; withFamilyId: string }
  | { type: "war_casualty"; familyId: string; crewId: string; byFamilyId: string }
  | { type: "crew_killed"; crewId: string; how: string }
  | { type: "betrayal_discovered"; crewId: string; about: string }
  | { type: "situation_raised"; situationId: string; kind: SituationKind }
  | { type: "situation_resolved"; kind: SituationKind; optionId: string; silent: boolean }
  /* ------------------------------------------------------------------ history
   * Things that happened to the world rather than to you. They are ordinary
   * events on the same stream, which is what lets the feed carry them and the
   * digest count them without any special case.
   */
  | { type: "history_happened"; week: number; headline: string; detail: string; contested: boolean }
  /** A dated event that was about a man you have already replaced. */
  | { type: "history_missed"; week: number; headline: string }
  | { type: "seat_emptied"; familyId: string; crewId: string; seat: "boss"; reason: string }
  | { type: "house_split"; familyId: string; factionId: string }
  | { type: "house_renamed"; familyId: string; from: string; to: string }
  /** A racket stopped paying, or started. Repeal is the loud one. */
  | { type: "racket_changed"; racket: string; open: boolean };

export interface Step {
  events: GameEvent[];
  rejected?: string;
}