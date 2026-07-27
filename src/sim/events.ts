import type { EvidenceTrack, Rank, Secret } from "./types";

/**
 * Commands are what the player asks for. They may be rejected.
 */
export type Command =
  | { type: "run_job"; jobId: string; crewIds: string[] }
  | { type: "recruit" }
  | { type: "promote"; crewId: string }
  | { type: "reassure"; crewId: string }
  | { type: "launder" }
  | { type: "cleanup" }
  | { type: "lay_low" }
  | { type: "retire" }
  | { type: "end_week" };

/**
 * Events are what actually happened. State is a fold over these, and the
 * street feed is a separate projection over the same stream — which is why
 * the feed can never drift out of sync with the simulation.
 */
export type GameEvent =
  | { type: "week_began"; week: number }
  | { type: "job_succeeded"; jobId: string; crewIds: string[]; payout: number }
  | { type: "job_failed"; jobId: string; crewIds: string[] }
  | { type: "evidence_added"; track: EvidenceTrack; amount: number; cause: string }
  | { type: "evidence_reduced"; track: EvidenceTrack; amount: number; how: string }
  | { type: "money_changed"; delta: number; reason: string }
  | { type: "crew_recruited"; crewId: string; name: string }
  | { type: "crew_promoted"; crewId: string; to: Rank }
  | { type: "crew_passed_over"; crewId: string; inFavourOf: string }
  | { type: "loyalty_shifted"; crewId: string; delta: number; cause: string }
  | { type: "crew_reassured"; crewId: string }
  | { type: "secret_surfaced"; crewId: string; secret: Secret }
  | { type: "crew_grumbled"; crewId: string; about: string }
  | { type: "coup_attempted"; crewId: string; succeeded: boolean; }
  | { type: "interacted"; crewId: string; action: string } 
  | { type: "boss_killed"; succeeded: boolean;  by: string }
  | { type: "indictment_filed"; weight: number }
  | { type: "crew_arrested"; crewId: string }
  | { type: "crew_flipped"; crewId: string; testimonialDump: number }
  | { type: "player_promoted"; to: Rank }
  | { type: "run_ended"; reason: "coup" | "indicted" | "retired" };

export interface Step {
  events: GameEvent[];
  rejected?: string;
}
