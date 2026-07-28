import type { GameEvent } from "./events";
import {
  chainOfCommand,
  familyById,
  memberById,
  playerFamily,
  reportsTo,
} from "./selectors";
import type { GameState } from "./types";

/**
 * The street feed is a read model over the same events that drive the
 * simulation. It holds no state of its own and makes no decisions, so it
 * physically cannot tell the player something the sim did not do.
 *
 * This is the mitigation for the design's largest risk: a betrayal the player
 * could not see coming reads as a bug, however correct the maths was.
 *
 * With a whole city simulated, it has a second job: filtering. You hear about
 * your own men and the men above you in detail, and about the other families
 * only when something happens that the whole city would know about.
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
  memberById(state, id)?.name ?? "someone";

const familyName = (state: GameState, id: string): string =>
  familyById(state, id)?.name ?? "another family";

/** Men close enough to you that you'd notice their mood. */
function knownTo(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const c of reportsTo(state, "player")) ids.add(c.id);
  for (const c of chainOfCommand(state)) ids.add(c.id);
  const fam = playerFamily(state);
  const mine = memberById(state, "player");
  for (const m of fam.members) {
    if (m.status === "active" && mine && m.superiorId === mine.superiorId) ids.add(m.id);
  }
  ids.add(fam.bossId);
  ids.add(fam.underbossId);
  ids.add(fam.consigliereId);
  return ids;
}

export function project(state: GameState, events: GameEvent[]): FeedLine[] {
  const lines: FeedLine[] = [];
  const week = state.week;
  const known = knownTo(state);
  const home = state.playerFamilyId;
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
          `${nameOf(state, e.crewId)} thought that one was his. He didn't say anything.`,
          e.crewId,
        );
        break;
      case "crew_reassigned":
        if (e.crewId === "player") {
          add("warning", `You answer to ${nameOf(state, e.toSuperiorId)} now.`);
        } else {
          add("neutral", `${nameOf(state, e.crewId)} was put with you.`, e.crewId);
        }
        break;
      case "crew_grumbled":
        if (!known.has(e.crewId)) break;
        add("warning", `Word is ${nameOf(state, e.crewId)} has been complaining about ${e.about}.`, e.crewId);
        break;
      case "secret_surfaced":
        if (!known.has(e.crewId)) break;
        add(
          "danger",
          `Somebody saw ${nameOf(state, e.crewId)} getting into a car he shouldn't have been in.`,
          e.crewId,
        );
        break;
      case "loyalty_shifted":
        if (!known.has(e.crewId)) break;
        if (e.delta <= -3) {
          add("warning", `${nameOf(state, e.crewId)} has been distant lately — ${e.cause}.`, e.crewId);
        }
        break;
      case "crew_reassured":
        add("neutral", `You sat down with ${nameOf(state, e.crewId)}. He seemed better after.`, e.crewId);
        break;
      case "kicked_up":
        add("money", `${money(e.amount)} went up to ${nameOf(state, e.toId)}. He counted it.`, e.toId);
        break;
      case "coup_attempted": {
        if (e.crewId === "player") {
          add(
            "danger",
            e.succeeded
              ? `${nameOf(state, e.targetId)} is gone. Nobody in the room is going to say your name.`
              : `You moved on ${nameOf(state, e.targetId)} and it didn't take.`,
            e.targetId,
          );
          break;
        }
        const onYou = e.targetId === "player";
        if (onYou) {
          add(
            "danger",
            e.succeeded
              ? `${nameOf(state, e.crewId)} moved on you. It worked.`
              : `${nameOf(state, e.crewId)} moved on you. It didn't work.`,
            e.crewId,
          );
          break;
        }
        // Other families' internal moves stay quiet; a dead boss is city news
        // and comes through boss_killed instead.
        if (e.familyId !== home) break;
        add(
          "danger",
          e.succeeded
            ? `${nameOf(state, e.crewId)} took ${nameOf(state, e.targetId)} out. Nobody is calling it that.`
            : `${nameOf(state, e.crewId)} tried something on ${nameOf(state, e.targetId)} and didn't come back.`,
          e.crewId,
        );
        break;
      }
      case "boss_killed":
        add(
          e.familyId === home ? "danger" : "warning",
          e.familyId === home
            ? `The old man is dead. ${nameOf(state, e.by)} is sitting in his chair.`
            : `Across town: the ${familyName(state, e.familyId)} people have a new boss.`,
          e.by,
        );
        break;
      case "seat_filled":
        if (e.familyId !== home) break;
        add("neutral", `${nameOf(state, e.crewId)} was moved up to ${e.rank}. The chair was empty.`, e.crewId);
        break;
      case "promotion_offered":
        add(
          "money",
          `${nameOf(state, e.sponsorId)} wants a word. They're talking about making you ${e.rank === "underboss" || e.rank === "boss" ? "the" : "a"} ${e.rank}.`,
          e.sponsorId,
        );
        break;
      case "player_promoted":
        add("money", `You're a ${e.to} now.`);
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
      case "regard_shifted": {
        if (!known.has(e.crewId)) break;
        if (e.delta <= -12) {
          add("warning", `${nameOf(state, e.crewId)} won't look at you — ${e.reason}.`, e.crewId);
        } else if (e.delta >= 20) {
          add("neutral", `${nameOf(state, e.crewId)} owes you one now — ${e.reason}.`, e.crewId);
        }
        break;
      }
      case "crew_killed":
        add("danger", `${nameOf(state, e.crewId)} is dead. ${e.how}.`, e.crewId);
        break;
      case "betrayal_discovered":
        add(
          "danger",
          `${nameOf(state, e.crewId)} knows what you did. He hasn't said so, which is worse.`,
          e.crewId,
        );
        break;
      case "war_declared":
        add(
          e.familyId === home ? "danger" : "warning",
          e.familyId === home
            ? `It's a war now. The ${familyName(state, e.withFamilyId)} people aren't talking anymore.`
            : `The ${familyName(state, e.familyId)} and ${familyName(state, e.withFamilyId)} houses are shooting at each other.`,
        );
        break;
      case "peace_made":
        if (e.familyId !== home && e.withFamilyId !== home) break;
        add("neutral", `It's settled with the ${familyName(state, e.familyId === home ? e.withFamilyId : e.familyId)} people. For now.`);
        break;
      case "war_casualty":
        if (e.familyId !== home) break;
        add("danger", `They got ${nameOf(state, e.crewId)} outside his own house.`, e.crewId);
        break;
      case "relation_shifted":
        if (e.familyId !== home || Math.abs(e.value) < 45) break;
        add(
          e.value < 0 ? "warning" : "neutral",
          e.value < 0
            ? `Things are bad with the ${familyName(state, e.withFamilyId)} people — ${e.reason}.`
            : `The ${familyName(state, e.withFamilyId)} people are friendly again — ${e.reason}.`,
        );
        break;
      case "situation_resolved":
        if (e.silent) add("warning", "You didn't answer. That was the answer.");
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