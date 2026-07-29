/**
 * READING THE CORPUS.
 *
 * Everything above this line is data. Everything below is the only sanctioned
 * way to ask it a question. Two things matter here:
 *
 *   The law is a fold, not a constant. `lawAt(era, week)` replays every
 *   timeline effect up to that week over the era's opening regime. That is what
 *   makes June 1968 feel different from May 1968 in the middle of a run, and it
 *   costs nothing, because the fold is pure and the week is derived from the
 *   command list like everything else.
 *
 *   The corpus is checked, not trusted. assertHistory() enforces the invariants
 *   that a human editing the tables will eventually violate: reigns that
 *   overlap, bosses seated in houses that did not exist, events dated outside
 *   their era, houses listed in an era they had not been founded for or had
 *   already been wiped out before. Call it in the test suite and in dev. A
 *   historical setting that quietly contradicts itself is worse than no
 *   historical setting.
 */

import { cpiFor, dateToWeek, periodMoney, weekToDate, ymCompare, ymWithin } from "./calendar";
import { ERAS, eraById, ORIGINS, originsForEra, settingById, type Era, type HistoricalEvent, type LawRegime, type Origin, type Setting } from "./eras";
import { HOUSES, houseById, type House, type Reign, type YM } from "./houses";
import { checkPeople, DEMOGRAPHICS } from "./people";

export * from "./calendar";
export * from "./eras";
export * from "./houses";
export * from "./people";

/* ------------------------------------------------------------------- lookups */

const ymOf = (iso: string): YM => {
  const d = new Date(Date.parse(iso));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1];
};

/** What this house was called on that date. Never guess this at a call site. */
export function houseNameAt(house: House, at: YM): string {
  let name = house.names[0]!.name;
  for (const n of house.names) if (ymCompare(at, n.from) >= 0) name = n.name;
  return name;
}

export const houseExistsAt = (house: House, at: YM): boolean =>
  ymCompare(at, house.born) >= 0 && (!house.ended || ymCompare(at, house.ended) < 0);

/**
 * Who is sitting in the chair. Returns the man of record and, separately, the
 * man in front of him — the Genovese arrangement is not an edge case to be
 * flattened, it is the most interesting thing about that house.
 */
export function bossAt(house: House, at: YM): { of_record?: Reign; front?: Reign } {
  const covers = (r: Reign): boolean => ymWithin(at, r.from, r.to);
  return {
    of_record: house.seats.find((r) => r.role === "boss" && covers(r)),
    front: house.seats.find((r) => (r.role === "front" || r.role === "acting") && covers(r)),
  };
}

export function seatAt(house: House, at: YM, role: Reign["role"]): Reign | undefined {
  return house.seats.find((r) => r.role === role && ymWithin(at, r.from, r.to));
}

/** The next documented change of boss after this date, if there is one. */
export function nextSuccession(house: House, after: YM): Reign | undefined {
  return house.seats
    .filter((r) => r.role === "boss" && r.to && ymCompare(r.to, after) > 0)
    .sort((a, b) => ymCompare(a.to!, b.to!))[0];
}

export const housesInEra = (era: Era): House[] =>
  era.houses.map((id) => houseById(id)).filter((h): h is House => Boolean(h));

export const erasInSetting = (setting: string): Era[] => ERAS.filter((e) => e.setting === setting);

/* ------------------------------------------------------------------- the fold */

export const eraWeekOf = (era: Era, iso: string): number => dateToWeek(era.start, iso);

export const eraLength = (era: Era): number => dateToWeek(era.start, era.end);

/** Events that land in this exact week. Deterministic; no rng involved. */
export const eventsInWeek = (era: Era, week: number): HistoricalEvent[] =>
  era.timeline.filter((e) => eraWeekOf(era, e.on) === week);

/**
 * The law as it stands in a given week: the opening regime with every timeline
 * effect up to and including that week folded over it.
 */
export function lawAt(era: Era, week: number): LawRegime {
  let law: LawRegime = { ...era.law, evidenceWeight: { ...era.law.evidenceWeight } };
  for (const ev of era.timeline) {
    if (eraWeekOf(era, ev.on) > week) continue;
    const patch = ev.effects?.law;
    if (!patch) continue;
    law = {
      ...law,
      ...patch,
      evidenceWeight: { ...law.evidenceWeight, ...(patch.evidenceWeight ?? {}) },
    };
  }
  return law;
}

/** Rackets still paying in a given week, after repeal and after replacement. */
export function racketsAt(era: Era, week: number): string[] {
  const live = new Set<string>(era.rackets);
  for (const ev of era.timeline) {
    if (eraWeekOf(era, ev.on) > week) continue;
    for (const r of ev.effects?.racketsEnd ?? []) live.delete(r);
    for (const r of ev.effects?.racketsBegin ?? []) live.add(r);
  }
  return [...live];
}

/**
 * The knobs the engine actually reads. Everything historical enters the
 * simulation through this one object, which keeps engine.ts free of dates.
 */
export interface Pressure {
  evidence: { physical: number; financial: number; testimonial: number };
  /** Multiplier on how much weight it takes before a case becomes an indictment. */
  indictmentMult: number;
  /** Base weekly chance a shaky man decides to cooperate. */
  flipBase: number;
  /** Weekly heat bleed-off. Bought police cool faster. */
  heatDecay: number;
  /** Whether the promotion ladder can reach `soldier` at all this week. */
  canBeMade: boolean;
  /** Whether a killing needs the table's permission. */
  commission: boolean;
}

export function pressureAt(era: Era, week: number, playerHeritage: Origin["heritage"]): Pressure {
  const law = lawAt(era, week);
  const setting = settingById(era.setting);

  // Surveillance is the multiplier on everything said out loud; RICO is the
  // multiplier on everything your crew did in your name.
  const listening = law.surveillance === "warranted" ? 1.35 : law.surveillance === "unlawful" ? 1.1 : 1;
  const rico = law.rico === "in_use" ? 1.4 : law.rico === "on_the_books" ? 1.05 : 1;
  const attention = 0.6 + law.federalAttention / 100;

  const eligible =
    setting.madeRequires === "none" ||
    (setting.madeRequires === "italian" && playerHeritage !== "other") ||
    (setting.madeRequires === "sicilian" && playerHeritage === "sicilian");

  return {
    evidence: {
      physical: law.evidenceWeight.physical * attention,
      financial: law.evidenceWeight.financial * attention * rico,
      testimonial: law.evidenceWeight.testimonial * attention * listening,
    },
    indictmentMult: law.rico === "in_use" ? 0.75 : law.rico === "on_the_books" ? 0.95 : 1.35,
    // Omertà is the whole story. Witness protection is the second half of it:
    // a man will not talk if there is nowhere afterwards to go.
    flipBase: ((100 - law.omerta) / 100) * (law.witnessProtection ? 0.05 : 0.018),
    heatDecay: 0.5 + (100 - law.federalAttention) / 120,
    canBeMade: law.booksOpen && eligible,
    commission: law.commission,
  };
}

/* ------------------------------------------------------------------ the intake */

export interface Opening {
  era: Era;
  setting: Setting;
  house: House;
  /** House name on the opening date — not its modern name. */
  houseName: string;
  boss: { of_record?: Reign; front?: Reign };
  /** The documented change of leadership the player is walking towards. */
  comingSuccession?: Reign;
  law: LawRegime;
  origins: Origin[];
  /** Starting purse and standing in period money. */
  purseFor: (origin: Origin) => number;
  canEverBeMade: (origin: Origin) => boolean;
}

export function openingFor(eraId: string, houseId: string): Opening | null {
  const era = eraById(eraId);
  const house = houseById(houseId);
  if (!era || !house || !era.houses.includes(houseId)) return null;

  const at = ymOf(era.start);
  const setting = settingById(era.setting);
  const year = new Date(Date.parse(era.start)).getUTCFullYear();

  return {
    era,
    setting,
    house,
    houseName: houseNameAt(house, at),
    boss: bossAt(house, at),
    comingSuccession: nextSuccession(house, at),
    law: era.law,
    origins: originsForEra(era.id),
    purseFor: (o) => periodMoney(o.purse, year, era.currency),
    canEverBeMade: (o) =>
      setting.madeRequires === "none" ||
      (setting.madeRequires === "italian" && o.heritage !== "other") ||
      (setting.madeRequires === "sicilian" && o.heritage === "sicilian"),
  };
}

/* --------------------------------------------------------------- the invariants */

export interface HistoryProblem {
  where: string;
  what: string;
}

/**
 * Run this in tests and in dev startup. It is the whole reason the corpus can
 * be edited by hand without the setting quietly rotting.
 */
export function checkHistory(): HistoryProblem[] {
  const problems: HistoryProblem[] = [];
  const say = (where: string, what: string): void => void problems.push({ where, what });

  for (const h of HOUSES) {
    if (h.names.length === 0) say(h.id, "house has no names");
    for (let i = 1; i < h.names.length; i++) {
      if (ymCompare(h.names[i]!.from, h.names[i - 1]!.from) <= 0)
        say(h.id, `name "${h.names[i]!.name}" is not after "${h.names[i - 1]!.name}"`);
    }
    if (ymCompare(h.names[0]!.from, h.born) < 0) say(h.id, "first name predates the house");

    const bosses = h.seats.filter((s) => s.role === "boss");
    for (const s of h.seats) {
      if (s.to && ymCompare(s.to, s.from) < 0) say(h.id, `${s.who}: seat ends before it starts`);
      if (ymCompare(s.from, h.born) < 0) say(h.id, `${s.who}: seated before the house existed`);
      if (h.ended && ymCompare(s.from, h.ended) >= 0) say(h.id, `${s.who}: seated after the house ended`);
    }
    // Two men of record in the same chair on the same day is the error the
    // Genovese front-boss arrangement makes easy to introduce by accident.
    for (let i = 0; i < bosses.length; i++) {
      for (let j = i + 1; j < bosses.length; j++) {
        const a = bosses[i]!;
        const b = bosses[j]!;
        const overlap =
          ymCompare(a.from, b.to ?? [9999, 12]) < 0 && ymCompare(b.from, a.to ?? [9999, 12]) < 0;
        if (overlap && a.certainty !== "contested" && b.certainty !== "contested")
          say(h.id, `${a.who} and ${b.who} both hold the chair at once, and neither is marked contested`);
      }
    }
  }

  for (const e of ERAS) {
    const from = ymOf(e.start);
    const to = ymOf(e.end);
    if (ymCompare(to, from) <= 0) say(e.id, "era ends before it begins");
    if (e.houses.length < 2) say(e.id, "an era needs at least two houses");

    for (const id of e.houses) {
      const h = houseById(id);
      if (!h) {
        say(e.id, `unknown house "${id}"`);
        continue;
      }
      if (h.setting !== e.setting) say(e.id, `${id} belongs to ${h.setting}, not ${e.setting}`);
      if (!houseExistsAt(h, from)) say(e.id, `${id} does not exist in ${e.start}`);
      if (!bossAt(h, from).of_record && !bossAt(h, from).front)
        say(e.id, `${id} has nobody in the chair at the opening date`);
    }

    for (const ev of e.timeline) {
      const at = ymOf(ev.on);
      if (ymCompare(at, from) < 0 || ymCompare(at, to) > 0)
        say(e.id, `"${ev.headline}" is dated outside the era`);
      const target = ev.effects?.killBossOf;
      if (target && !e.houses.includes(target))
        say(e.id, `"${ev.headline}" kills the boss of ${target}, which is not in this era`);
      for (const side of [ev.effects?.relation?.a, ev.effects?.relation?.b]) {
        if (side && !e.houses.includes(side)) say(e.id, `"${ev.headline}" shifts relations with ${side}, not in this era`);
      }
      if (ev.effects?.relation && ev.effects.relation.a === ev.effects.relation.b)
        say(e.id, `"${ev.headline}" sets a house's standing with itself — use splitHouse`);
      const split = ev.effects?.splitHouse;
      if (split && !e.houses.includes(split)) say(e.id, `"${ev.headline}" splits ${split}, not in this era`);
    }

    for (const r of e.openingRelations) {
      for (const side of [r.a, r.b]) {
        if (!e.houses.includes(side)) say(e.id, `opening relation refers to ${side}, not in this era`);
      }
      if (r.a === r.b) say(e.id, `opening relation ${r.a} refers to itself`);
      if (r.value < -100 || r.value > 100) say(e.id, `relation ${r.a}/${r.b} out of range`);
    }

    if (originsForEra(e.id).length < 2) say(e.id, "fewer than two origins available");
    if (!e.law.booksOpen && e.entryRanks.includes("soldier"))
      say(e.id, "books are closed but a soldier start is offered");
  }

  for (const o of ORIGINS) {
    for (const id of o.eras ?? []) if (!eraById(id)) say(o.id, `origin scoped to unknown era "${id}"`);
  }

  // Every era must be able to populate itself with men of that era.
  for (const e of ERAS) {
    if (!DEMOGRAPHICS[e.id]) say(e.id, "no demographic profile — the roster would be generated as 1985 men");
  }
  problems.push(...checkPeople());

  return problems;
}

export function assertHistory(): void {
  const problems = checkHistory();
  if (problems.length > 0) {
    const lines = problems.map((p) => `  ${p.where}: ${p.what}`).join("\n");
    throw new Error(`The historical corpus is inconsistent:\n${lines}`);
  }
}

/* ------------------------------------------------------------------ formatting */

/** "October 1957 — Carlo Gambino (boss)". Used by the intake dossier. */
export function describeSeat(r: Reign | undefined): string {
  if (!r) return "vacant";
  const qualifier = r.certainty === "contested" ? " (disputed)" : "";
  return `${r.who}${qualifier}`;
}

export const yearsOf = (era: Era): string => {
  const a = new Date(Date.parse(era.start)).getUTCFullYear();
  const b = new Date(Date.parse(era.end)).getUTCFullYear();
  return a === b ? `${a}` : `${a}–${b}`;
};

export { cpiFor, periodMoney, weekToDate };