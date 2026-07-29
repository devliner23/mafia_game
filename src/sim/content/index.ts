import type { Background, Job } from "../types";
import { ORIGINS } from "../sim";


/**
 * Content is bundled, not loaded, so `satisfies` gives us the same guarantee
 * Zod gave us at runtime — a malformed entry fails the build instead of the app.
 *
 * These numbers are the balance surface. Tune here first, not in engine.ts.
 */
export const JOBS = [
  { id: "shakedown", name: "Shakedown", minRank: "associate", crewNeeded: 0, payout: 1800,
    difficulty: 25, evidence: { physical: 0.5, financial: 1, testimonial: 2.5 } },
  { id: "boost_cars", name: "Boosting cars", minRank: "associate", crewNeeded: 0, payout: 3200,
    difficulty: 40, evidence: { physical: 3, financial: 1.5, testimonial: 1 } },
  { id: "loan_collection", name: "Loan collection", minRank: "soldier", crewNeeded: 1, payout: 5000,
    difficulty: 45, evidence: { physical: 2.5, financial: 3, testimonial: 3.5 } },
  { id: "hijack_load", name: "Hijacking a load", minRank: "soldier", crewNeeded: 2, payout: 11000,
    difficulty: 60, evidence: { physical: 6, financial: 3, testimonial: 2 } },
  { id: "protection_route", name: "Protection route", minRank: "capo", crewNeeded: 2, payout: 16000,
    difficulty: 55, evidence: { physical: 2, financial: 7, testimonial: 5 } },
  { id: "union_skim", name: "Skimming a local", minRank: "capo", crewNeeded: 3, payout: 28000,
    difficulty: 70, evidence: { physical: 1, financial: 12, testimonial: 4 } },
  { id: "port_contract", name: "Port contract", minRank: "underboss", crewNeeded: 3, payout: 52000,
    difficulty: 78, evidence: { physical: 2, financial: 16, testimonial: 7 } },
  { id: "city_contract", name: "City contract", minRank: "boss", crewNeeded: 4, payout: 95000,
    difficulty: 85, evidence: { physical: 3, financial: 22, testimonial: 10 } },
] satisfies Job[];

/** Kept for save compatibility and for anything that wants a short name list. */
export const NAMES: readonly string[] = [
  "Tommy Bracco", "Sal Vitale", "Ricky Manzo", "Joey Fusco", "Vinnie Corso",
  "Petey DeLuca", "Mikey Rossi", "Angelo Grieco", "Frankie Salerno", "Dom Ferraro",
  "Nunzio Pace", "Carmine Lo Duca", "Eddie Marchetti", "Gus Tavano", "Lou Bellante",
  "Chick Amato", "Benny Riggio", "Marco Dellucci",
];

/**
 * Backgrounds are the only asymmetric start in the game. Each one buys you
 * something and charges you for it somewhere else, so the choice reads as a
 * character rather than a difficulty slider.
 */
export const BACKGROUNDS = [
  {
    id: "corner",
    name: "Corner kid",
    blurb: "Nothing but nerve and a neighbourhood that owes you nothing.",
    money: 3000,
    standing: 0,
    ledger: { physical: 0, financial: 0, testimonial: 0 },
    stats: { competence: 4, ambition: 10, discretion: -6 },
  },
  {
    id: "union",
    name: "Union hand",
    blurb: "Ten years on the docks. People take your call, which is worth more than cash.",
    money: 5000,
    standing: 18,
    ledger: { physical: 0, financial: 0, testimonial: 4 },
    stats: { competence: 0, ambition: -4, discretion: 8 },
  },
  {
    id: "bookmaker",
    name: "Bookmaker's son",
    blurb: "You started with money. The books it came from are still out there.",
    money: 11000,
    standing: 6,
    ledger: { physical: 0, financial: 14, testimonial: 0 },
    stats: { competence: 6, ambition: 0, discretion: 2 },
  },
] satisfies Background[];

export const CONFIG = {
  jobs: JOBS as Job[],
  names: NAMES,
  backgrounds: ORIGINS,
};