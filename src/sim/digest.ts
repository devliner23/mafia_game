import type { Command, GameEvent } from "./events";
import { project, type FeedLine } from "./feed";
import { caseProgress } from "./systems/ledger";
import { playerBacking } from "./systems/relations";
import { memberById, playerFamily, playerRank, reportsTo } from "./selectors";
import type { GameState, Rank } from "./types";

/**
 * The aftermath.
 *
 * The sim already produces a full event stream, but a list of events is not an
 * answer to the only question a player actually asks after acting: *what did
 * that cost me?* This diffs the state before against the state after and says
 * so in numbers, next to the story the feed tells in words.
 *
 * It reads two states and an event list. It decides nothing and mutates
 * nothing, so it cannot report something that did not happen.
 */

export type ChangeTone = "good" | "bad" | "neutral";

export interface Change {
  label: string;
  /** Formatted for display — the digest owns presentation of its own numbers. */
  text: string;
  delta: number;
  tone: ChangeTone;
}

export interface PersonChange {
  crewId: string;
  name: string;
  rank: Rank;
  /** How he now feels about you, and how far that moved. */
  regard: number;
  regardDelta: number;
  loyaltyDelta: number;
  /** Set when something happened to him rather than to his opinion. */
  became?: "dead" | "flipped" | "arrested" | "joined" | "promoted";
  /** Whether he is one of yours, for grouping. */
  yours: boolean;
}

export type DigestKind = "action" | "week" | "situation" | "promotion" | "ending";

export interface Digest {
  kind: DigestKind;
  title: string;
  subtitle: string | null;
  /** What happened, in words. */
  story: FeedLine[];
  /** What happened, in numbers. */
  changes: Change[];
  /** Who moved, and how they feel about you now. */
  people: PersonChange[];
  /** Set when the game is now waiting on the player for something. */
  waiting: string | null;
}

const money = (n: number): string =>
  `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

const signed = (n: number, digits = 0): string =>
  `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(digits)}`;

/** What the player just did, said plainly. */
function titleFor(cmd: Command, state: GameState): { title: string; kind: DigestKind } {
  switch (cmd.type) {
    case "run_job":
      return { title: "The job", kind: "action" };
    case "recruit":
      return { title: "You took someone on", kind: "action" };
    case "promote":
      return { title: "You moved him up", kind: "action" };
    case "reassure":
      return { title: "You sat down with him", kind: "action" };
    case "kick_up":
      return { title: "You kicked up", kind: "action" };
    case "make_a_move":
      return { title: "You made your move", kind: "action" };
    case "take_promotion":
      return { title: `You're a ${playerRank(state)} now`, kind: "promotion" };
    case "resolve":
      return { title: "You gave them an answer", kind: "situation" };
    case "seek_sitdown":
      return { title: "The sitdown", kind: "action" };
    case "launder":
      return { title: "Washed", kind: "action" };
    case "cleanup":
      return { title: "Cleaned up", kind: "action" };
    case "lay_low":
      return { title: "You went quiet", kind: "action" };
    case "retire":
      return { title: "You got out", kind: "ending" };
    case "end_week":
      return { title: `Week ${state.week}`, kind: "week" };
    default:
      return { title: "What happened", kind: "action" };
  }
}

export function makeDigest(
  before: GameState,
  after: GameState,
  events: GameEvent[],
  cmd: Command,
): Digest {
  const { title, kind } = titleFor(cmd, after);
  const changes: Change[] = [];

  /**
   * `min` is the noise floor. Interrupting somebody to tell them their backing
   * moved by a tenth of a point trains them to dismiss the popup without
   * reading it, which costs you every popup after that one.
   */
  const add = (label: string, delta: number, text: string, goodIsUp = true, min = 0.5): void => {
    if (Math.abs(delta) < min) return;
    const good = goodIsUp ? delta > 0 : delta < 0;
    changes.push({ label, text, delta, tone: good ? "good" : "bad" });
  };

  add("On hand", after.money - before.money, money(after.money - before.money), true, 1);
  add("Standing", after.standing - before.standing, signed(after.standing - before.standing), true, 1);

  for (const track of ["physical", "financial", "testimonial"] as const) {
    const d = after.ledger[track] - before.ledger[track];
    // Evidence going up is bad, which is the one place the arrow inverts.
    add(track, d, signed(d, 1), false, 0.5);
  }

  const caseD = caseProgress(after) - caseProgress(before);
  add("Case built", caseD * 100, `${signed(caseD * 100)}%`, false, 1);

  const backD = playerBacking(after) - playerBacking(before);
  add("Backing", backD, signed(backD, 1), true, 0.4);

  const crewD = reportsTo(after, "player").length - reportsTo(before, "player").length;
  add("Your men", crewD, signed(crewD), true, 1);

  // Relations with the other houses.
  const famBefore = playerFamily(before);
  const famAfter = playerFamily(after);
  for (const other of after.families) {
    if (other.id === famAfter.id) continue;
    const b = famBefore.relations[other.id] ?? 0;
    const a = famAfter.relations[other.id] ?? 0;
    add(`${other.name} family`, a - b, signed(a - b), true, 4);
  }

  // People. Regard first, because it is the number that decides your life.
  const people: PersonChange[] = [];
  const seen = new Set<string>();
  const yours = new Set(reportsTo(after, "player").map((m) => m.id));

  for (const now of famAfter.members) {
    if (now.isPlayer) continue;
    seen.add(now.id);
    const was = famBefore.members.find((m) => m.id === now.id);

    let became: PersonChange["became"] | undefined;
    if (!was) became = "joined";
    else if (was.status === "active" && now.status !== "active") {
      became = now.status === "dead" ? "dead" : now.status === "flipped" ? "flipped" : "arrested";
    } else if (was.rank !== now.rank) became = "promoted";

    const regardDelta = now.regard - (was?.regard ?? 0);
    const loyaltyDelta = now.loyalty - (was?.loyalty ?? now.loyalty);

    if (!became && Math.abs(regardDelta) < 2.5 && Math.abs(loyaltyDelta) < 6) continue;

    const entry: PersonChange = {
      crewId: now.id,
      name: now.name,
      rank: now.rank,
      regard: Math.round(now.regard),
      regardDelta: Math.round(regardDelta * 10) / 10,
      loyaltyDelta: Math.round(loyaltyDelta * 10) / 10,
      yours: yours.has(now.id),
    };
    if (became) entry.became = became;
    people.push(entry);
  }

  // Men who left the roster entirely (war casualties in other houses aside).
  for (const was of famBefore.members) {
    if (was.isPlayer || seen.has(was.id)) continue;
    people.push({
      crewId: was.id,
      name: was.name,
      rank: was.rank,
      regard: Math.round(was.regard),
      regardDelta: 0,
      loyaltyDelta: 0,
      became: "dead",
      yours: false,
    });
  }

  // Biggest movers first; anything that happened to a body outranks an opinion.
  people.sort((a, b) => {
    const wa = a.became ? 1000 : 0;
    const wb = b.became ? 1000 : 0;
    return wb + Math.abs(b.regardDelta) - (wa + Math.abs(a.regardDelta));
  });

  let waiting: string | null = null;
  if (after.pending) waiting = "Somebody is waiting on an answer.";
  else if (after.offer) {
    const sponsor = memberById(after, after.offer.sponsorId);
    waiting = `${sponsor?.name ?? "Somebody"} has put your name forward for ${after.offer.rank}.`;
  }

  const subtitle =
    kind === "week" ? `${famAfter.name} family` : cmd.type === "run_job" ? cmd.jobId.replace(/_/g, " ") : null;

  return {
    kind,
    title,
    subtitle,
    story: project(after, events),
    changes,
    people: people.slice(0, 8),
    waiting,
  };
}

/** True when there is genuinely nothing worth interrupting the player for. */
export const isQuiet = (d: Digest): boolean =>
  d.changes.length === 0 && d.people.length === 0 && d.story.length === 0 && !d.waiting;