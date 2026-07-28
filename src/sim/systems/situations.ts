import type { GameEvent } from "../events";
import { clamp, type Rng } from "../rng";
import {
  chainOfCommand,
  me,
  memberById,
  playerFamily,
  playerRank,
  reportsTo,
} from "../selectors";
import { addEvidence, round1 } from "./ledger";
import {
  WAR,
  atWarWith,
  friends,
  relationBetween,
  shiftRegard,
  shiftRelation,
  tiedTo,
} from "./relations";
import { rankIndex, type Crew, type GameState, type Situation, type SituationKind } from "../types";

/**
 * Situations are the game asking you a question it will hold against you.
 *
 * Every option here is a trade between two constituencies: the man above you
 * and the men beside you, your own crew and your own hide, this week's money
 * and next year's witness. None of them is free and none of them is safe.
 *
 * The last option in every list is the one silence picks for you, so ending
 * the week without answering is itself an answer.
 */

const OPTION_SILENCE = "silence";
/** Weeks before the same kind of question can be put to you again. */
const COOLDOWN = 10;

/* ------------------------------------------------------------- generation */

type Trigger = {
  kind: SituationKind;
  weight: number;
  /** Null when the world isn't currently arranged for this to happen. */
  build: (state: GameState, rng: Rng) => Situation | null;
};

const memberField = (state: GameState, id: string | null): Crew | undefined =>
  id ? memberById(state, id) : undefined;

let seq = 0;
const mkId = (state: GameState): string => `sit_${state.week}_${state.nextSituationId++}_${seq++}`;

function base(
  state: GameState,
  kind: SituationKind,
  fromId: string,
  aboutId: string | null,
  familyId: string | null,
  text: string,
  options: Situation["options"],
): Situation {
  return {
    id: mkId(state),
    kind,
    week: state.week,
    fromId,
    aboutId,
    familyId,
    text,
    options,
    expiresWeek: state.week + 1,
  };
}

const TRIGGERS: Trigger[] = [
  {
    kind: "shortfall",
    weight: 3,
    build: (state) => {
      const sup = chainOfCommand(state)[0];
      if (!sup || state.week < 4) return null;
      const men = reportsTo(state, "player");
      const scapegoat = men.length > 0 ? men[0]! : null;
      return base(
        state,
        "shortfall",
        sup.id,
        scapegoat?.id ?? null,
        null,
        `${sup.name} says the number was light this month. He is not asking where it went — he is waiting for you to tell him.`,
        [
          { id: "pay", label: "Cover it yourself", hint: "Costs you money. He stops asking." },
          ...(scapegoat
            ? [
                {
                  id: "blame",
                  label: `Put it on ${scapegoat.name}`,
                  hint: "He wears it. So does everyone who likes him.",
                },
              ]
            : []),
          { id: "stand", label: "Tell him the number is the number", hint: "He remembers being told no." },
          { id: OPTION_SILENCE, label: "Say nothing and hope", hint: "He fills in the blank himself." },
        ],
      );
    },
  },
  {
    kind: "friend_marked",
    weight: 4,
    build: (state, rng) => {
      const sup = chainOfCommand(state)[0];
      const close = friends(state);
      if (!sup || close.length === 0) return null;
      const mark = rng.pick(close);
      if (mark.id === sup.id) return null;
      return base(
        state,
        "friend_marked",
        sup.id,
        mark.id,
        null,
        `${sup.name} wants ${mark.name} gone, and he wants you to be the one who does it. He mentions, twice, that he is asking you personally.`,
        [
          { id: "do_it", label: "Do it", hint: "The man above you is satisfied. His friends won't be." },
          { id: "warn", label: `Warn ${mark.name}`, hint: "He owes you his life. If it gets back, you're finished." },
          { id: "refuse", label: "Tell him you won't", hint: "Clean hands, and a superior who now doubts you." },
          { id: OPTION_SILENCE, label: "Stall", hint: "Somebody else gets the job, and the credit." },
        ],
      );
    },
  },
  {
    kind: "skimmer",
    weight: 3,
    build: (state) => {
      const thief = reportsTo(state, "player").find((c) => c.secret === "skimming");
      if (!thief) return null;
      return base(
        state,
        "skimmer",
        thief.id,
        thief.id,
        null,
        `${thief.name} has been taking off the top. Not much. Enough that other people have noticed you haven't noticed.`,
        [
          { id: "beat", label: "Make an example of him", hint: "The crew learns. He never forgets." },
          { id: "cover", label: "Cover the difference quietly", hint: "Costs money. Buys a man who knows you saved him." },
          { id: "hand_up", label: "Hand him to your capo", hint: "Correct, and cold. Your crew will read it as cold." },
          { id: OPTION_SILENCE, label: "Let it ride", hint: "It grows, and so does what it says about you." },
        ],
      );
    },
  },
  {
    kind: "flip_rumour",
    weight: 4,
    build: (state, rng) => {
      const men = reportsTo(state, "player");
      const suspect = men.find((c) => c.secret === "talking_to_feds") ?? men.find((c) => c.discretion < 35);
      if (!suspect) return null;
      const wrong = suspect.secret !== "talking_to_feds";
      void rng;
      return base(
        state,
        "flip_rumour",
        suspect.id,
        suspect.id,
        null,
        `Word is ${suspect.name} has been seen where he had no business being. It might be nothing. It has been nothing before.`,
        [
          { id: "clip", label: "Don't wait to find out", hint: "A body, and no way to be sure you were right." },
          { id: "test", label: "Feed him something false and watch", hint: "Slow. Costs you a week of not knowing." },
          { id: "sit", label: "Sit down with him", hint: "Costs money. Buys loyalty, or buys nothing." },
          { id: OPTION_SILENCE, label: "Watch and wait", hint: wrong ? "Probably fine." : "He keeps talking." },
        ],
      );
    },
  },
  {
    kind: "rival_route",
    weight: 3,
    build: (state, rng) => {
      const fam = playerFamily(state);
      const others = state.families.filter((f) => f.id !== fam.id && relationBetween(fam, f.id) > WAR);
      if (others.length === 0 || rankIndex(playerRank(state)) < rankIndex("soldier")) return null;
      const rival = rng.pick(others);
      return base(
        state,
        "rival_route",
        me(state).id,
        null,
        rival.id,
        `Two men from the ${rival.name} people have been collecting on a street you collect on. They know it's yours. That's the message.`,
        [
          { id: "back_off", label: "Let them have it", hint: "Cheap, quiet, and everyone hears you moved." },
          { id: "push", label: "Put them in the hospital", hint: "The street stays yours. So does the response." },
          { id: "sitdown", label: "Take it to a sitdown", hint: "Slow and political. Bosses notice who asks." },
          { id: OPTION_SILENCE, label: "Do nothing for now", hint: "They come back with more men." },
        ],
      );
    },
  },
  {
    kind: "peer_campaign",
    weight: 3,
    build: (state, rng) => {
      const you = me(state);
      const fam = playerFamily(state);
      const rivals = fam.members.filter(
        (m) =>
          m.status === "active" &&
          !m.isPlayer &&
          m.superiorId === you.superiorId &&
          m.ambition > 55 &&
          m.regard < 10,
      );
      if (rivals.length === 0) return null;
      const rival = rng.pick(rivals);
      return base(
        state,
        "peer_campaign",
        rival.id,
        rival.id,
        null,
        `${rival.name} has been telling people you're careless. He says it lightly, in front of the right men, and never when you're in the room.`,
        [
          { id: "undermine", label: "Give them something worse about him", hint: "It works. It also travels." },
          { id: "buy", label: "Put an envelope in his hand", hint: "Expensive. Men who take it usually stop." },
          { id: "confront", label: "Say it to his face, publicly", hint: "Ends the talk. Starts something else." },
          { id: OPTION_SILENCE, label: "Let him talk", hint: "People start believing quiet men." },
        ],
      );
    },
  },
  {
    kind: "boss_envelope",
    weight: 2,
    build: (state) => {
      const fam = playerFamily(state);
      const boss = memberById(state, fam.bossId);
      if (!boss || boss.isPlayer || state.money < 12000) return null;
      const ask = Math.round(state.money * 0.3);
      return base(
        state,
        "boss_envelope",
        boss.id,
        null,
        null,
        `Word comes down that the old man has expenses this month. Nobody says a number. Everybody knows there is a number.`,
        [
          { id: "pay_full", label: `Send ${ask.toLocaleString("en-US")} up`, hint: "He notices generosity. He remembers it longer than you'd think." },
          { id: "pay_light", label: "Send a token", hint: "Correct. Forgettable. Slightly insulting." },
          { id: "plead", label: "Send word that you're short", hint: "Honest, and honest men get passed over." },
          { id: OPTION_SILENCE, label: "Send nothing", hint: "He will assume a reason. It won't be a kind one." },
        ],
      );
    },
  },
  {
    kind: "vouch_request",
    weight: 2,
    build: (state, rng) => {
      const sup = chainOfCommand(state)[0];
      const fam = playerFamily(state);
      if (!sup || rankIndex(playerRank(state)) < rankIndex("soldier")) return null;
      const candidates = fam.members.filter(
        (m) => m.status === "active" && !m.isPlayer && m.rank === "associate" && m.superiorId !== "player",
      );
      if (candidates.length === 0) return null;
      const kid = rng.pick(candidates);
      return base(
        state,
        "vouch_request",
        sup.id,
        kid.id,
        null,
        `${sup.name} wants ${kid.name} straightened out and wants your name on it. If the kid is ever a problem, it will be your problem.`,
        [
          { id: "vouch", label: "Put your name on him", hint: "He's yours now — the credit and the liability." },
          { id: "decline", label: "Say he isn't ready", hint: "Safe. Your superior asked you for something and you said no." },
          { id: OPTION_SILENCE, label: "Avoid answering", hint: "Somebody else vouches, and gains a man." },
        ],
      );
    },
  },
  {
    kind: "war_levy",
    weight: 5,
    build: (state) => {
      const fam = playerFamily(state);
      const enemies = atWarWith(state, fam);
      if (enemies.length === 0) return null;
      const enemy = enemies[0]!;
      const sup = chainOfCommand(state)[0] ?? memberById(state, fam.bossId);
      if (!sup) return null;
      return base(
        state,
        "war_levy",
        sup.id,
        null,
        enemy.id,
        `The thing with the ${enemy.name} people is costing money and men. ${sup.name} is going around the table asking what everybody can contribute.`,
        [
          { id: "pay", label: "Fund it", hint: "Money now. Goodwill that outlasts the war." },
          { id: "send_men", label: "Send your men", hint: "Somebody may not come back. The house remembers who sent them." },
          { id: "duck", label: "Say you're stretched thin", hint: "Everyone at that table hears it." },
          { id: OPTION_SILENCE, label: "Be somewhere else", hint: "Absence gets noticed during a war." },
        ],
      );
    },
  },
  {
    kind: "sitdown_called",
    weight: 4,
    build: (state) => {
      const fam = playerFamily(state);
      if (rankIndex(playerRank(state)) < rankIndex("capo")) return null;
      const tense = state.families
        .filter((f) => f.id !== fam.id)
        .find((f) => relationBetween(fam, f.id) <= -22 && relationBetween(fam, f.id) > WAR);
      if (!tense) return null;
      return base(
        state,
        "sitdown_called",
        memberById(state, fam.bossId)?.id ?? "player",
        null,
        tense.id,
        `A sitdown with the ${tense.name} people has been called and you are the one going. Whatever is agreed in that room, your name is on it.`,
        [
          { id: "concede", label: "Give them the smaller thing", hint: "Peace. Your own house calls it soft." },
          { id: "hold", label: "Give nothing", hint: "Your house likes it. The other house doesn't forget." },
          { id: "trade", label: "Trade a route for a guarantee", hint: "Costs earnings. Buys quiet." },
          { id: OPTION_SILENCE, label: "Send somebody else", hint: "Both houses draw the same conclusion." },
        ],
      );
    },
  },
];

/** At most one open question at a time, weighted by what the world supports. */
export function raiseSituation(state: GameState, rng: Rng): GameEvent[] {
  if (state.pending || state.over) return [];

  const all = TRIGGERS.map((t) => ({ t, s: t.build(state, rng) })).filter(
    (x): x is { t: Trigger; s: Situation } => x.s !== null,
  );
  if (all.length === 0) return [];

  // Don't ask the same question twice running. Without this the one situation
  // that is always available (your capo asking about the number) drowns out
  // every situation that depends on the world being arranged a particular way.
  const fresh = all.filter((x) => state.week - (state.lastRaised[x.t.kind] ?? -99) >= COOLDOWN);
  const built = fresh.length > 0 ? fresh : all;

  const total = built.reduce((n, x) => n + x.t.weight, 0);
  let roll = rng.next() * total;
  let chosen = built[0]!;
  for (const x of built) {
    roll -= x.t.weight;
    if (roll <= 0) {
      chosen = x;
      break;
    }
  }

  state.pending = chosen.s;
  state.lastRaised[chosen.s.kind] = state.week;
  return [{ type: "situation_raised", situationId: chosen.s.id, kind: chosen.s.kind }];
}

/* ------------------------------------------------------------- resolution */

function kill(state: GameState, victim: Crew, how: string): GameEvent[] {
  const fam = playerFamily(state);
  const events: GameEvent[] = [];
  victim.status = "dead";
  events.push({ type: "crew_killed", crewId: victim.id, how });

  // Everyone tied to him takes it personally, in proportion to the tie.
  for (const m of tiedTo(fam, victim.id)) {
    if (m.isPlayer) continue;
    const bond = m.bonds.find((b) => b.otherId === victim.id);
    if (!bond) continue;
    events.push(
      ...shiftRegard(state, m.id, round1(-0.35 * bond.strength), `over ${victim.name}`),
    );
    m.loyalty = clamp(round1(m.loyalty - bond.strength * 0.12), 0, 100);
  }
  return events;
}

const money = (state: GameState, delta: number, reason: string): GameEvent => {
  state.money = Math.max(0, Math.round(state.money + delta));
  return { type: "money_changed", delta: Math.round(delta), reason };
};

/**
 * The consequence table. Numbers here are deliberately large — a political
 * decision that moves regard by two points is not a decision, it's a texture.
 */
export function resolveSituation(state: GameState, optionId: string, rng: Rng): GameEvent[] {
  const sit = state.pending;
  if (!sit) return [];
  const events: GameEvent[] = [];
  const fam = playerFamily(state);
  const from = memberById(state, sit.fromId);
  const about = memberField(state, sit.aboutId);
  const silence = optionId === OPTION_SILENCE;

  const R = (id: string | undefined, d: number, why: string): void => {
    if (id) events.push(...shiftRegard(state, id, d, why));
  };
  const houseWide = (d: number, why: string): void => {
    for (const m of fam.members) {
      if (m.status === "active" && !m.isPlayer) events.push(...shiftRegard(state, m.id, d, why));
    }
  };

  switch (sit.kind) {
    case "shortfall": {
      if (optionId === "pay") {
        events.push(money(state, -Math.round(state.money * 0.35) - 2000, "covering the number"));
        R(from?.id, 12, "covered the number");
      } else if (optionId === "blame" && about) {
        R(from?.id, 8, "gave him a name");
        R(about.id, -35, "you put it on him");
        about.grudges += 1;
        about.loyalty = clamp(about.loyalty - 20, 0, 100);
      } else if (optionId === "stand") {
        R(from?.id, -18, "told him no");
        // Men respect it, quietly.
        for (const m of reportsTo(state, "player")) R(m.id, 9, "you took the weight");
      } else {
        R(from?.id, -22, "no answer");
      }
      break;
    }

    case "friend_marked": {
      if (optionId === "do_it" && about) {
        events.push(...kill(state, about, "on orders"));
        R(from?.id, 30, "did what was asked");
        events.push(...addEvidence(state, "physical", 14, "a body"));
        fam.heat = clamp(fam.heat + 10, 0, 100);
      } else if (optionId === "warn" && about) {
        R(about.id, 45, "you warned him");
        about.loyalty = clamp(about.loyalty + 25, 0, 100);
        // This is the single most dangerous thing you can do in the game.
        if (rng.chance(0.4)) {
          R(from?.id, -60, "he found out");
          if (from) from.loyalty = clamp(from.loyalty - 30, 0, 100);
          events.push({ type: "betrayal_discovered", crewId: from?.id ?? "", about: about.id });
        }
      } else if (optionId === "refuse") {
        R(from?.id, -30, "refused an order");
      } else {
        R(from?.id, -20, "stalled");
        if (about) R(about.id, 10, "you didn't move on him");
      }
      break;
    }

    case "skimmer": {
      if (!about) break;
      if (optionId === "beat") {
        R(about.id, -40, "you put hands on him");
        about.loyalty = clamp(about.loyalty - 10, 0, 100);
        about.secret = "none";
        for (const m of reportsTo(state, "player")) {
          if (m.id !== about.id) {
            m.loyalty = clamp(m.loyalty + 6, 0, 100);
            R(m.id, -6, "saw what you did");
          }
        }
      } else if (optionId === "cover") {
        events.push(money(state, -6000, "covering for him"));
        R(about.id, 40, "you covered for him");
        about.loyalty = clamp(about.loyalty + 22, 0, 100);
      } else if (optionId === "hand_up") {
        const sup = chainOfCommand(state)[0];
        R(sup?.id, 20, "handed up a thief");
        events.push(...kill(state, about, "handed up"));
        for (const m of reportsTo(state, "player")) R(m.id, -14, "you gave one of us up");
      } else {
        events.push(money(state, -3000, "what he took"));
        houseWide(-4, "you let it go");
      }
      break;
    }

    case "flip_rumour": {
      if (!about) break;
      const guilty = about.secret === "talking_to_feds";
      if (optionId === "clip") {
        events.push(...kill(state, about, "suspicion"));
        events.push(...addEvidence(state, "physical", 16, "a body"));
        if (!guilty) {
          // You killed a loyal man. The house finds out what he wasn't.
          houseWide(-18, "you killed a straight man");
          fam.reputation = clamp(fam.reputation - 6, 0, 100);
        } else {
          houseWide(6, "you caught it early");
        }
      } else if (optionId === "test") {
        if (guilty) {
          events.push({ type: "secret_surfaced", crewId: about.id, familyId: fam.id, secret: about.secret });
          about.status = "flipped";
          events.push(...addEvidence(state, "testimonial", 20, "he was already talking"));
        } else {
          R(about.id, -12, "you tested him");
        }
      } else if (optionId === "sit") {
        events.push(money(state, -4000, "an envelope"));
        about.loyalty = clamp(about.loyalty + 18, 0, 100);
        R(about.id, 25, "you sat down with him");
        if (guilty && rng.chance(0.45)) about.secret = "none";
      } else if (guilty) {
        events.push(...addEvidence(state, "testimonial", 14, "he kept talking"));
      }
      break;
    }

    case "rival_route": {
      const other = sit.familyId;
      if (!other) break;
      if (optionId === "back_off") {
        state.standing = Math.max(0, state.standing - 15);
        events.push(...shiftRelation(state, fam.id, other, 12, "you gave ground"));
        houseWide(-10, "you gave ground");
      } else if (optionId === "push") {
        state.standing += 25;
        events.push(...shiftRelation(state, fam.id, other, -30, "you put their men down"));
        events.push(...addEvidence(state, "physical", 9, "a beating"));
        houseWide(8, "you held the street");
      } else if (optionId === "sitdown") {
        events.push(...shiftRelation(state, fam.id, other, 8, "a sitdown"));
        R(memberById(state, fam.bossId)?.id, 14, "handled it properly");
        R(chainOfCommand(state)[0]?.id, 10, "handled it properly");
      } else {
        events.push(...shiftRelation(state, fam.id, other, -12, "drift"));
        state.standing = Math.max(0, state.standing - 8);
        houseWide(-6, "you did nothing");
      }
      break;
    }

    case "peer_campaign": {
      if (!about) break;
      if (optionId === "undermine") {
        R(about.id, -45, "you moved against him");
        about.grudges += 1;
        // People who watched you do it wonder when it's their turn.
        for (const m of fam.members) {
          if (m.status === "active" && !m.isPlayer && m.factionId === about.factionId) {
            R(m.id, -10, "you moved against one of ours");
          }
        }
        R(chainOfCommand(state)[0]?.id, 8, "quieted a problem");
      } else if (optionId === "buy") {
        events.push(money(state, -9000, "an envelope"));
        R(about.id, 30, "you paid him respect");
      } else if (optionId === "confront") {
        R(about.id, -25, "you called him out");
        houseWide(5, "you said it to his face");
        if (rng.chance(0.35)) {
          R(chainOfCommand(state)[0]?.id, -15, "made a scene");
        }
      } else {
        R(about.id, -8, "you let him talk");
        houseWide(-8, "the talk went around");
      }
      break;
    }

    case "boss_envelope": {
      const boss = memberById(state, fam.bossId);
      if (optionId === "pay_full") {
        events.push(money(state, -Math.round(state.money * 0.3), "up to the old man"));
        R(boss?.id, 30, "an envelope");
        state.standing += 20;
      } else if (optionId === "pay_light") {
        events.push(money(state, -Math.round(state.money * 0.08), "a token"));
        R(boss?.id, 4, "a token");
      } else if (optionId === "plead") {
        R(boss?.id, -12, "came up short");
      } else {
        R(boss?.id, -30, "sent nothing");
        state.standing = Math.max(0, state.standing - 10);
      }
      break;
    }

    case "vouch_request": {
      if (!about) break;
      if (optionId === "vouch") {
        about.superiorId = "player";
        about.factionId = "player";
        R(about.id, 40, "you vouched for him");
        R(from?.id, 18, "you took the weight");
        about.loyalty = clamp(about.loyalty + 20, 0, 100);
        // The liability is real: his secret is now yours.
        if (about.secret === "talking_to_feds") {
          events.push({ type: "secret_surfaced", crewId: about.id, familyId: fam.id, secret: about.secret });
        }
      } else if (optionId === "decline") {
        R(from?.id, -20, "you turned him down");
      } else {
        R(from?.id, -12, "you avoided him");
        R(about.id, -10, "you passed on him");
      }
      break;
    }

    case "war_levy": {
      if (optionId === "pay") {
        events.push(money(state, -Math.round(state.money * 0.4), "the war"));
        houseWide(10, "you paid for the war");
        state.standing += 15;
      } else if (optionId === "send_men") {
        const men = reportsTo(state, "player");
        houseWide(14, "you sent your men");
        state.standing += 20;
        if (men.length > 0 && rng.chance(0.55)) {
          events.push(...kill(state, rng.pick(men), "the war"));
        }
      } else {
        houseWide(-16, "you sat out the war");
        state.standing = Math.max(0, state.standing - 15);
        if (silence) R(memberById(state, fam.bossId)?.id, -20, "absent during a war");
      }
      break;
    }

    case "sitdown_called": {
      const other = sit.familyId;
      if (!other) break;
      if (optionId === "concede") {
        events.push(...shiftRelation(state, fam.id, other, 35, "you conceded"));
        houseWide(-14, "you gave them the room");
      } else if (optionId === "hold") {
        events.push(...shiftRelation(state, fam.id, other, -20, "you gave nothing"));
        houseWide(12, "you gave them nothing");
      } else if (optionId === "trade") {
        events.push(...shiftRelation(state, fam.id, other, 25, "a trade"));
        events.push(money(state, -Math.round(state.money * 0.15), "the route you traded"));
        R(memberById(state, fam.bossId)?.id, 15, "brought back quiet");
      } else {
        events.push(...shiftRelation(state, fam.id, other, -15, "you didn't show"));
        houseWide(-18, "you didn't show");
      }
      break;
    }

    default:
      break;
  }

  events.push({ type: "situation_resolved", kind: sit.kind, optionId, silent: silence });
  state.pending = null;
  return events;
}

/** Ending the week without answering picks the last option for you. */
export const silenceOption = (): string => OPTION_SILENCE;