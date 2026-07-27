import type { GameEvent } from "./events";
import type { GameState } from "./types";

/**
 * The street feed is a read model over the same events that drive the
 * simulation. It holds no state of its own and makes no decisions, so it
 * physically cannot tell the player something the sim did not do.
 *
 * This is the mitigation for the design's largest risk: a betrayal the player
 * could not see coming reads as a bug, however correct the maths was.
 */
export type FeedTone = "neutral" | "money" | "warning" | "danger";

export interface FeedLine {
  week: number;
  tone: FeedTone;
  text: string;
  /** Present when the line is about a specific person, so the UI can link it. */
  crewId?: string;
}

const nameOf = (state: GameState, id: string): string =>
  state.crew.find((c) => c.id === id)?.name ?? "someone";

export function project(state: GameState, events: GameEvent[]): FeedLine[] {
  const lines: FeedLine[] = [];
  const week = state.week;
  const add = (tone: FeedTone, text: string, crewId?: string): void => {
    lines.push(crewId ? { week, tone, text, crewId } : { week, tone, text });
  };

  for (const e of events) {
    switch (e.type) {
      case "job_succeeded":
        add("money", `The ${e.jobId.replace(/_/g, " ")} went clean. ${money(e.payout)} came back.`);
        break;
      case "job_failed":
        add("warning", `The ${e.jobId.replace(/_/g, " ")} went wrong. Nothing to show for it.`);
        break;
      case "evidence_added":
        if (e.amount >= 6) {
          add("warning", `That left something behind — ${e.track} evidence, from ${e.cause}.`);
        }
        break;
      case "evidence_reduced":
        if (e.amount >= 4) add("neutral", `Some of the ${e.track} problem went away: ${e.how}.`);
        break;
      case "crew_recruited":
        add("neutral", `${e.name} came around looking for work. He's in.`, e.crewId);
        break;
      case "crew_promoted":
        add("neutral", `${nameOf(state, e.crewId)} got bumped up to ${e.to}.`, e.crewId);
        break;
      case "crew_passed_over":
        add(
          "warning",
          `${nameOf(state, e.crewId)} thought that promotion was his. He didn't say anything.`,
          e.crewId,
        );
        break;
      case "crew_grumbled":
        add("warning", `Word is ${nameOf(state, e.crewId)} has been complaining about ${e.about}.`, e.crewId);
        break;
      case "secret_surfaced":
        add(
          "danger",
          `Somebody saw ${nameOf(state, e.crewId)} getting into a car he shouldn't have been in.`,
          e.crewId,
        );
        break;
      case "loyalty_shifted":
        if (e.delta <= -3) {
          add("warning", `${nameOf(state, e.crewId)} has been distant lately — ${e.cause}.`, e.crewId);
        }
        break;
      case "crew_reassured":
        add("neutral", `You sat down with ${nameOf(state, e.crewId)}. He seemed better after.`, e.crewId);
        break;
      case "coup_attempted":
        add(
          "danger",
          e.succeeded
            ? `${nameOf(state, e.crewId)} moved on you. It worked.`
            : `${nameOf(state, e.crewId)} moved on you. It didn't work.`,
          e.crewId,
        );
        break;
      case "indictment_filed":
        add("danger", `Sealed indictment. They've been building this for a while.`);
        break;
      case "crew_flipped":
        add("danger", `${nameOf(state, e.crewId)} is cooperating.`, e.crewId);
        break;
      case "crew_arrested":
        add("warning", `${nameOf(state, e.crewId)} got picked up. He's keeping his mouth shut.`, e.crewId);
        break;
      case "player_promoted":
        add("money", `You're a ${e.to} now.`);
        break;
      case "run_ended":
        add("danger", endingLine(e.reason));
        break;
      default:
        break;
    }
  }

  return lines;
}

const endingLine = (reason: "coup" | "indicted" | "retired"): string =>
  reason === "coup"
    ? "It was someone you promoted."
    : reason === "indicted"
      ? "The case closed around you."
      : "You got out. Almost nobody does.";

const money = (n: number): string => `$${n.toLocaleString("en-US")}`;
